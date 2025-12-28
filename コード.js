function checkHapitasAllInOne() {
  const targetSheetName = "監視リスト"; 
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(targetSheetName);
  
  if (!sheet) {
    console.error("エラー：シート「" + targetSheetName + "」が見つかりません。");
    return;
  }

  const data = sheet.getDataRange().getValues();
  
  const options = {
    "muteHttpExceptions": true,
    "headers": {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  };

  for (let i = 1; i < data.length; i++) {
    const isEnabled = data[i][0]; // A列
    const url = data[i][2];       // C列
    
    if (!isEnabled || !url || !url.includes("hapitas.jp")) continue;

    try {
      const response = UrlFetchApp.fetch(url, options);
      const html = response.getContentText();

      // 指定されたタグでポイントを抽出
      const pointText = Parser.data(html)
        .from('<strong class="calculated_detail_point">')
        .to('</strong>')
        .build();

      if (pointText) {
        const currentPoint = Number(pointText.replace(/,/g, "").trim());
        const oldPoint = Number(String(data[i][3]).replace(/,/g, "")); // D列
        const bestPoint = Number(String(data[i][5]).replace(/,/g, "")); // F列

        let statusMsg = "変動なし";
        let bgColor = "#ffffff";

        // 1. 前回比の判定
        if (!isNaN(oldPoint) && oldPoint !== currentPoint) {
          const diff = currentPoint - oldPoint;
          statusMsg = (diff > 0 ? "📈 +" : "📉 ") + diff + "P";
          bgColor = diff > 0 ? "#ccffcc" : "#ffcccc"; // 上がれば緑、下がれば赤
        }

        // 2. 過去最高値の判定（GitHubのリリースノートのように）
        if (isNaN(bestPoint) || currentPoint > bestPoint) {
          sheet.getRange(i + 1, 6).setValue(currentPoint); // F列に新記録保存
          statusMsg = "⭐最高値更新！: " + currentPoint + "P";
          bgColor = "#fff2cc"; // 最高値はゴールド
        }

        // 結果をシートに書き込み
        sheet.getRange(i + 1, 5).setValue(statusMsg);
        sheet.getRange(i + 1, 5).setBackground(bgColor);
        sheet.getRange(i + 1, 4).setValue(currentPoint); // D列（次回比較用）

      } else {
        sheet.getRange(i + 1, 5).setValue("タグ未検出");
      }

    } catch (e) {
      sheet.getRange(i + 1, 5).setValue("アクセス失敗");
    }
    
    Utilities.sleep(1000); // サーバー負荷軽減（1秒待機）
  }
  console.log("すべてのチェックが完了しました。");
}