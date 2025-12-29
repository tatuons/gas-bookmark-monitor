/**
 * 統合型ウェブ監視システム（数値・差分監視、リンク化、更新日時記録付き）
 */
function megaWatcher() {
  const targetSheetName = "監視リスト"; 
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(targetSheetName);
  
  if (!sheet) {
    console.error("エラー：シート「" + targetSheetName + "」が見つかりません。");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const userEmail = Session.getActiveUser().getEmail();
  
  const options = {
    "muteHttpExceptions": true,
    "headers": {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  };

  for (let i = 1; i < data.length; i++) {
    const isEnabled = data[i][0]; 
    const name = data[i][1];      
    let url = data[i][2]; // C列       
    const oldData = String(data[i][3]); // D列
    const bestPt = Number(data[i][5]);  // F列
    const startTag = data[i][6];  // G列
    const endTag = data[i][7];    // H列
    
    if (!isEnabled || !url) continue;

  // --- C列のURLを強制的にハイパーリンク化 ---
    const currentCellValue = sheet.getRange(i + 1, 3).getFormula();
    if (!currentCellValue.includes("HYPERLINK")) {
      sheet.getRange(i + 1, 3).setFormula('=HYPERLINK("' + url + '","' + url + '")');
    }

    try {
      const response = UrlFetchApp.fetch(url, options);
      const html = response.getContentText();
      let currentContent = "";
      let isNumericMode = false;

      // --- データ抽出 ---
      if (startTag === "全文") {
        currentContent = html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().substring(0, 10000);
      } else if (startTag && endTag) {
        const extracted = Parser.data(html).from(startTag).to(endTag).build();
        if (extracted) {
          currentContent = extracted.replace(/,/g, "").trim();
          isNumericMode = !isNaN(currentContent) && currentContent !== "";
        }
      }

      if (currentContent !== "") {
        let statusMsg = "変動なし";
        let bgColor = "#ffffff";
        let shouldNotify = false;

        // --- 比較ロジック ---
        if (oldData !== "" && oldData !== currentContent) {
          shouldNotify = true;
          const now = new Date();
          
          // I列に更新日時を記録 (例: 12/29 15:30)
          sheet.getRange(i + 1, 9).setValue(Utilities.formatDate(now, "JST", "MM/dd HH:mm"));

          if (isNumericMode) {
            const curNum = Number(currentContent);
            const oldNum = Number(oldData);
            const diff = curNum - oldNum;
            statusMsg = (diff > 0 ? "📈 +" : "📉 ") + diff + "P (" + curNum + "P)";
            bgColor = diff > 0 ? "#ccffcc" : "#ffcccc";

            if (isNaN(bestPt) || curNum > bestPt) {
              statusMsg = "⭐最高値更新!! (" + curNum + "P)";
              bgColor = "#fff2cc";
              sheet.getRange(i + 1, 6).setValue(curNum);
            }
          } else {
            statusMsg = "✨更新あり";
            bgColor = "#e1f5fe";
          }
        }

        // --- シートへの書き込み ---
        sheet.getRange(i + 1, 5).setValue(statusMsg);
        sheet.getRange(i + 1, 5).setBackground(bgColor);
        sheet.getRange(i + 1, 4).setValue(currentContent);

        // --- 通知送信 ---
        if (shouldNotify) {
          const subject = `【監視通知】${name}：${statusMsg}`;
          const body = `名前：${name}\n状況：${statusMsg}\nURL：${url}\n\n管理シート：\n${ss.getUrl()}`;
          MailApp.sendEmail(userEmail, subject, body);
        }
      }
    } catch (e) {
      sheet.getRange(i + 1, 5).setValue("アクセス失敗");
    }
    Utilities.sleep(1500);
  }
}