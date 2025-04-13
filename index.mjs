import { Client, Databases } from "node-appwrite";
import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();

export default async function handler(req, res) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const { senderId, receiverId, messageText, chatId } = JSON.parse(req.body);

    // Fetch sender for name
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
      return res.json({ success: false, reason: "No token" });
    }

    const payload = {
      to: expoPushToken,
      sound: "default",
      title: `New message from ${senderDoc.name}`,
      body: messageText,
      data: { chatId },
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
    console.log("Push response: " + JSON.stringify(pushJson)); // Log success response
    res.json({ success: true, message: "Notification sent", pushJson });
  } catch (err) {
    console.error("Error: " + err.message); // Log error
    res.json({ success: false, error: err.message });
  }
};
