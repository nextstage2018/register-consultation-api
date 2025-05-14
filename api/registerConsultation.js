// api/registerConsultation.js (CommonJS, 列順修正版)
const { google } = require('googleapis');
const axios      = require('axios');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { questionerName, genre, query } = req.body;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // — Sheets API 認証・クライアント生成 —
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // — No. を算出 (A列の行数＋1) —
    const meta = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:A'
    });
    const rowNumber = (meta.data.values ? meta.data.values.length : 0) + 1;

    // — スプレッドシートに書き込み (11列分) —
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            rowNumber,                       // A: No.
            new Date().toISOString(),        // B: 記入日
            questionerName,                  // C: 記入者
            '',                              // D: 経過日数
            '未回答',                         // E: ステータス
            query,                           // F: 質問内容
            '',                              // G: 参考資料
            '',                              // H: 背景・前提の補足
            '',                              // I: 質問の意図
            genre,                           // J: 質問ジャンル
            ''                               // K: 回答
          ]
        ]
      }
    });

    // — ChatWork に通知 —
    const formBody = new URLSearchParams({
      body:
        `[To:${process.env.CHATWORK_ROOM_ID}] No.${rowNumber}：` +
        `${questionerName}さんの相談が届きました\n` +
        `ジャンル：${genre}\n` +
        `内容（一部）：${query.substring(0, 50)}…`
    }).toString();

    await axios.post(
      `https://api.chatwork.com/v2/rooms/${process.env.CHATWORK_ROOM_ID}/messages`,
      formBody,
      {
        headers: {
          'X-ChatWorkToken': process.env.CHATWORK_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
