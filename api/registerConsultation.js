// api/registerConsultation.js
const { google } = require('googleapis');
const axios = require('axios');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { questionerName, genre, query } = req.body;

    // — Google Sheets API 認証・書き込み —
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[new Date().toISOString(), questionerName, genre, query]]
      }
    });

    // — ChatWork API に通知 —
    await axios.post(
      `https://api.chatwork.com/v2/rooms/${process.env.CHATWORK_ROOM_ID}/messages`,
      new URLSearchParams({ body: `${questionerName}さんから相談が届きました: ${query.substring(0,50)}…` }),
      { headers: { 'X-ChatWorkToken': process.env.CHATWORK_TOKEN } }
    );

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
