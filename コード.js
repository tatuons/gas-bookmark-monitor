function checkUpdates() {
  // 1. シート名をここで指定（スプレッドシートのタブ名と合わせてください）
  const targetSheetName = "監視リスト"; 
  
  // 2. スプレッドシートとシートを取得
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(targetSheetName);

  // シートが見つからない場合の安全策
  if (!sheet) {
    console.error("エラー：シート「" + targetSheetName + "」が見つかりません。");
    return;
  }

  // 3. データを取得
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const isEnabled = data[i][0]; // A列: 監視ON/OFF
    const url = data[i][2];       // C列: URL
    const oldHash = data[i][3];    // D列: 前回のハッシュ

    if (!isEnabled || !url) continue;

    try {
      // サイトの情報を取得
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const html = response.getContentText();
      
      // ハッシュ値を生成
      const newHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, html)
                      .map(byte => ("0" + (byte & 0xFF).toString(16)).slice(-2)).join("");

      // 前回のハッシュと比較（GitHubのような変更検知）
      if (oldHash && String(oldHash) !== newHash) {
        sheet.getRange(i + 1, 5).setValue("✨新入荷あり！"); // E列
        sheet.getRange(i + 1, 5).setBackground("#fff2cc");
      } else {
        sheet.getRange(i + 1, 5).setValue("変化なし");
        sheet.getRange(i + 1, 5).setBackground("#ffffff");
      }

      // 今回のハッシュをD列に保存
      sheet.getRange(i + 1, 4).setValue(newHash);

    } catch (e) {
      sheet.getRange(i + 1, 5).setValue("エラー: 取得失敗");
    }
  }
  console.log("チェックが完了しました。");
}