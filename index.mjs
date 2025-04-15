import { Client, Databases } from "node-appwrite";
import fetch from "node-fetch";

export default async ({ req, res, log, error }) => {
  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
    APPWRITE_DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID,
  } = process.env;

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const {
      senderId,
      receiverId,
      messageText,
      chatId,
      customTitle,
      customLogo,
      avatarUrl,
      timestamp,
    } = body;

    if (!senderId || !receiverId || !messageText || !chatId) {
      return res.json({ success: false, error: "Missing required fields" }, 400);
    }

    const senderDoc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_USER_COLLECTION_ID,
      senderId
    );

    const receiverDoc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_USER_COLLECTION_ID,
      receiverId
    );

    const expoPushToken = receiverDoc?.expoPushToken;
    if (!expoPushToken) {
      return res.json({ success: false, error: "No Expo push token found" }, 404);
    }

    const payload = {
      to: expoPushToken,
      sound: "default",
      title: customTitle || `New message from ${senderDoc.name}`,
      body: `${messageText}${timestamp ? ` • ${timestamp}` : ""}`,
      data: {
        chatId,
        senderId,
        avatarUrl: avatarUrl || senderDoc.avatarUrl,
      },
      android: {
        icon: customLogo || undefined, // Expo Android-only custom icon
        imageUrl: avatarUrl || senderDoc.avatarUrl, // visible in expanded notification
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

    return res.json({
      success: true,
      message: "Notification sent successfully",
      result: pushJson,
    });
  } catch (err) {
    error("Error: " + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
