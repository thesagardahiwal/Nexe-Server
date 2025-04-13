import { Client, Databases } from "node-appwrite";
import fetch from 'node-fetch';

export default async function handler(req, res, context) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const { senderId, receiverId, messageText, chatId } = await req.json(); // ✅ Parse JSON safely

    // Fetch sender info
    const senderDoc = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_USER_COLLECTION_ID,
      senderId
    );

    const receiverDoc = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_USER_COLLECTION_ID,
      receiverId
    );

    const expoPushToken = receiverDoc.expoPushToken;

    if (!expoPushToken) {
      return res.json({ success: false, reason: "Receiver has no expoPushToken" });
    }

    const payload = {
      to: expoPushToken,
      sound: "default",
      title: `New message from ${senderDoc.name || "Someone"}`,
      body: messageText,
      data: {
        chatId,
        url: `myapp://chat/${chatId}`
      },
    };

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const pushJson = await pushRes.json();

    context.log("✅ Push sent:", JSON.stringify(pushJson));
    return res.json({ success: true, message: "Notification sent", pushJson });

  } catch (err) {
    context.error("❌ Error:", err.message);
    return res.json({ success: false, error: err.message });
  }
}
