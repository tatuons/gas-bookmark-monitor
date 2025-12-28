function checkUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  // 2行目から順にチェック
  for (let i = 1; i < data.length; i++) {
    const isEnabled = data[i][0]; // A列: 監視ON/OFF
    const url = data[i][2];       // C列: URL
    const oldHash = data[i][3];    // D列: 前回のハッシュ

    if (!isEnabled || !url) continue;

    try {
      // サイトのHTMLを取得
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const html = response.getContentText();
      
      // MD5ハッシュ値を生成（内容が変わったか判定するため）
      const newHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, html)
                      .map(byte => ("0" + (byte & 0xFF).toString(16)).slice(-2)).join("");

      if (oldHash && oldHash !== newHash) {
        // 更新があった場合
        sheet.getRange(i + 1, 5).setValue("✨新入荷あり！");
        sheet.getRange(i + 1, 5).setBackground("#fff2cc"); // セルを目立たせる
      } else {
        sheet.getRange(i + 1, 5).setValue("変化なし");
        sheet.getRange(i + 1, 5).setBackground("#ffffff");
      }

      // 今回のハッシュを保存
      sheet.getRange(i + 1, 4).setValue(newHash);

    } catch (e) {
      sheet.getRange(i + 1, 5).setValue("エラー: 取得失敗");
    }
  }
}
