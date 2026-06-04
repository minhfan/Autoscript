/**
 * GOOGLE APPS SCRIPT BACKEND WEB APP (Code.gs)
 *
 * Bản cập nhật ổn định: tạo project từ template, cập nhật metadata,
 * rename file Google Sheet khi project name thay đổi, và đồng bộ log.
 */

var SPREADSHEET_ID = "1S6YxzKJE7X5vZRZduA36KDc_E00Cdkxp2mD3VXhwfmA";

/**
 * Xử lý request GET.
 */
function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;

    if (action === "createProject") {
      var projectName = e.parameter.name || "Autoscript Project";
      var templateId = e.parameter.templateId || SPREADSHEET_ID;

      if (!templateId || templateId === "ĐIỀN_ID_TRANG_TÍNH_CỦA_BẠN_VÀO_ĐÂY") {
        throw new Error("LỖI: Chưa có Template Spreadsheet ID được cấu hình.");
      }

      var templateSpreadsheet = SpreadsheetApp.openById(templateId);
      if (!templateSpreadsheet) {
        throw new Error("Không thể mở file Spreadsheet mẫu để nhân bản.");
      }

      var newSpreadsheet = templateSpreadsheet.copy(projectName);
      var newId = newSpreadsheet.getId();
      var newUrl = newSpreadsheet.getUrl();

      try {
        var file = DriveApp.getFileById(newId);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch (shareErr) {
        Logger.log("Lỗi thiết lập chia sẻ trang tính: " + shareErr.toString());
      }

      var moveStatus = "not_attempted";
      var moveError = null;
      var folderId = e.parameter.folderId;
      if (folderId) {
        moveStatus = "attempted";
        try {
          var targetFile = DriveApp.getFileById(newId);
          var targetFolder = DriveApp.getFolderById(folderId);
          targetFile.moveTo(targetFolder);
          moveStatus = "success";
        } catch (folderErr) {
          moveStatus = "failed";
          moveError = folderErr.toString();
          Logger.log("Lỗi di chuyển file vào thư mục Google Drive: " + moveError);
        }
      }

      var newSheet = newSpreadsheet.getSheetByName("Full-show");
      if (newSheet) {
        if (e.parameter.speaker !== undefined) {
          newSheet.getRange("B1").setValue(e.parameter.speaker);
        }
        if (e.parameter.source !== undefined) {
          newSheet.getRange("B2").setValue(e.parameter.source);
        }

        var lastRow = newSheet.getLastRow();
        if (lastRow >= 5) {
          newSheet.getRange(5, 1, lastRow - 5 + 1, 6).clearContent();
        }
      }

      var result = {
        status: "success",
        spreadsheetId: newId,
        spreadsheetUrl: newUrl,
        spreadsheetName: projectName,
        folderIdReceived: folderId || "",
        moveStatus: moveStatus,
        moveError: moveError
      };

      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "updateInfo") {
      var targetId = e.parameter.spreadsheetId;
      if (!targetId) throw new Error("Thiếu spreadsheetId");

      var targetSpreadsheet = SpreadsheetApp.openById(targetId);

      if (e.parameter.name !== undefined) {
        var nextName = String(e.parameter.name || "").trim();
        if (nextName) {
          targetSpreadsheet.rename(nextName);
          DriveApp.getFileById(targetId).setName(nextName);
        }
      }

      var targetSheet = targetSpreadsheet.getSheetByName("Full-show");
      if (targetSheet) {
        if (e.parameter.speaker !== undefined) {
          targetSheet.getRange("B1").setValue(e.parameter.speaker);
        }
        if (e.parameter.source !== undefined) {
          targetSheet.getRange("B2").setValue(e.parameter.source);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getProjectInfo") {
      var infoTargetId = e.parameter.spreadsheetId;
      if (!infoTargetId) throw new Error("Thiếu spreadsheetId");

      var infoSpreadsheet = SpreadsheetApp.openById(infoTargetId);
      var infoSheet = infoSpreadsheet.getSheetByName("Full-show");
      var speaker = "";
      var source = "";
      if (infoSheet) {
        speaker = infoSheet.getRange("B1").getValue();
        source = infoSheet.getRange("B2").getValue();
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        speaker: speaker,
        source: source
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!SPREADSHEET_ID || SPREADSHEET_ID === "ĐIỀN_ID_TRANG_TÍNH_CỦA_BẠN_VÀO_ĐÂY") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "LỖI: Bạn chưa điền SPREADSHEET_ID."
      }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }

    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!spreadsheet) {
      throw new Error("Không thể kết nối đến Google Sheets.");
    }

    var sheets = spreadsheet.getSheets();
    var sheetNames = sheets.map(function(s) { return s.getName(); });
    var hasFullShow = sheetNames.indexOf("Full-show") !== -1;

    var sheet = spreadsheet.getSheetByName("Full-show");
    var allowedActions = [];
    if (sheet) {
      allowedActions = getAllowedValues(sheet.getRange(5, 2)) || [];
    }

    var report = {
      status: "success",
      message: "Kết nối đến Google Sheets thành công.",
      spreadsheetName: spreadsheet.getName(),
      spreadsheetId: SPREADSHEET_ID,
      allTabs: sheetNames,
      targetTabExists: hasFullShow,
      validationOnColumnB: allowedActions,
      diagnostics: hasFullShow
        ? "Tab 'Full-show' tồn tại và sẵn sàng đồng bộ."
        : "CẢNH BÁO: Không tìm thấy tab 'Full-show'."
    };

    return ContentService.createTextOutput(JSON.stringify(report, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "LỖI KẾT NỐI TRANG TÍNH: " + err.toString(),
      currentId: SPREADSHEET_ID
    }, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Xử lý request POST: nhận dữ liệu log từ frontend và ghi vào sheet.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var targetSpreadsheetId = SPREADSHEET_ID;
    var data = [];

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      if (payload.spreadsheetId) {
        targetSpreadsheetId = payload.spreadsheetId;
      }
      data = payload.logs || [];
    } else if (Array.isArray(payload)) {
      data = payload;
    }

    var spreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
    if (!spreadsheet) {
      throw new Error("Không thể kết nối đến Google Sheets. ID nhận được: " + targetSpreadsheetId);
    }

    var sheet = spreadsheet.getSheetByName("Full-show");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Không tìm thấy tab sheet tên 'Full-show' trong file Google Sheet."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var startRow = 5;
    var lastRow = sheet.getLastRow();

    if (lastRow >= startRow) {
      sheet.getRange(startRow, 1, lastRow - startRow + 1, 6).clearContent();
    }

    if (data && data.length > 0) {
      var sampleCell = sheet.getRange(5, 2);
      var allowedActions = getAllowedValues(sampleCell);

      for (var i = 0; i < data.length; i++) {
        var row = startRow + i;
        var log = data[i];

        var actionValue = log.action || "";
        if (actionValue === "DELETE" && allowedActions) {
          if (allowedActions.indexOf("DELETE") === -1) {
            for (var k = 0; k < allowedActions.length; k++) {
              var val = allowedActions[k].toString().toUpperCase();
              if (val.indexOf("DEL") === 0) {
                actionValue = allowedActions[k];
                break;
              }
            }
          }
        }

        sheet.getRange(row, 1).setValue("");

        try {
          sheet.getRange(row, 2).setValue(actionValue);
        } catch (valErr) {
          var actionCell = sheet.getRange(row, 2);
          actionCell.clearDataValidation();
          actionCell.setValue(actionValue);
        }

        var cellIn = sheet.getRange(row, 3);
        cellIn.setNumberFormat("@");
        cellIn.setValue(log.tcin || "00:00:00:00");

        var cellOut = sheet.getRange(row, 4);
        cellOut.setNumberFormat("@");
        cellOut.setValue(log.tcout || "00:00:00:00");

        sheet.getRange(row, 5).setValue(log.script || "");
        sheet.getRange(row, 6).setValue(log.note || "");
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã đồng bộ thành công " + data.length + " dòng."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Đọc các giá trị Data Validation từ một ô.
 */
function getAllowedValues(cell) {
  var rule = cell.getDataValidation();
  if (!rule) return null;

  var criteria = rule.getCriteriaType();
  var args = rule.getCriteriaValues();

  if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    return args[0];
  }

  if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
    var range = args[0];
    var values = range.getValues();
    return values.flat();
  }

  return null;
}

/**
 * Hàm test đồng bộ trong Apps Script Editor.
 */
function testSync() {
  var testData = JSON.stringify([
    {
      action: "DELETE",
      tcin: "00:01:00:00",
      tcout: "00:02:00:00",
      script: "Test Script từ Apps Script Editor",
      note: "Test Note"
    }
  ]);

  var response = doPost({
    postData: {
      contents: testData
    }
  });

  Logger.log(response.getContent());
}

/**
 * Chạy thủ công để kích hoạt quyền ghi Google Drive.
 */
function authorizeDrive() {
  var tempFile = DriveApp.createFile("Autoscript_Auth_Temp.txt", "Temp");
  tempFile.setTrashed(true);
  Logger.log("Đã cấp quyền ghi Google Drive thành công.");
}
