module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Only POST requests are allowed"
    });
  }

  try {
    const { channelLink, botToken } = req.body || {};

    if (!channelLink || !botToken) {
      return res.status(400).json({
        success: false,
        error: "Channel link and bot token are required"
      });
    }

    const match = channelLink.match(
      /(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{5,})\/?$/
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        error: "Please enter a public Telegram channel link"
      });
    }

    const username = match[1];

    const telegram = async (method, params) => {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/${method}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(params)
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error("Telegram connection failed. Check bot token and channel permissions.");
      }

      return data.result;
    };

    const chat = await telegram("getChat", {
      chat_id: "@" + username
    });

    let photo = null;

    if (chat.photo?.big_file_id) {
      const file = await telegram("getFile", {
        file_id: chat.photo.big_file_id
      });

      const imageResponse = await fetch(
        `https://api.telegram.org/file/bot${botToken}/${file.file_path}`
      );

      if (imageResponse.ok) {
        const buffer = Buffer.from(
          await imageResponse.arrayBuffer()
        );

        const type =
          imageResponse.headers.get("content-type") || "image/jpeg";

        if (type.startsWith("image/")) {
          photo = `data:${type};base64,${buffer.toString("base64")}`;
        }
      }
    }

    return res.status(200).json({
      success: true,
      title: chat.title || username,
      photo,
      joinUrl: `https://t.me/${username}`
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Connection failed"
    });
  }
};
