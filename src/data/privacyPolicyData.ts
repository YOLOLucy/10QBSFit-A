export interface PrivacyPolicyContent {
  title: string;
  lastUpdated: string;
  appName: string;
  companyName: string;
  country: string;
  contactEmail: string;
  liveUrl: string;
  sections: {
    id: string;
    title: string;
    titleEn: string;
    summary: string;
    content: string[];
  }[];
}

export const PRIVACY_POLICY_DATA: PrivacyPolicyContent = {
  title: "10QBS 隱私權政策與個人資料保護說明",
  lastUpdated: "2026 年最新修訂版",
  appName: "10qbs",
  companyName: "10qbs",
  country: "Taiwan (台灣)",
  contactEmail: "teatime.lucy@gmail.com",
  liveUrl: "https://www.freeprivacypolicy.com/live/463ed120-1afe-4220-83f3-0a80fd3f89f4",
  sections: [
    {
      id: "definitions",
      title: "一、名詞定義與適用範圍 (Definitions)",
      titleEn: "Interpretation and Definitions",
      summary: "界定 10qbs 應用程式、用戶、個人資料與服務範圍之法律意涵。",
      content: [
        "**應用程式 (Application)**：指由 10qbs 提供之「10qbs」軟體服務及相關功能。",
        "**本公司 (Company / We / Us)**：指 10qbs（所在地：台灣 Taiwan）。",
        "**個人資料 (Personal Data / Personal Information)**：指任何與已識別或可識別之自然人相關的資訊（如電子郵件、姓名、身高等）。",
        "**服務 (Service)**：指 10qbs 所提供之應用程式功能、問卷量測與健康資產管理等服務。",
        "**裝置 (Device)**：指可存取本服務之任何電腦、手機、平板等硬體終端設備。",
        "**使用數據 (Usage Data)**：指使用服務時系統自動收集之技術數據（如 IP 位址、造訪時間、診斷日誌等）。",
        "**使用者 (User / You)**：指存取或使用本服務之個別使用者。"
      ]
    },
    {
      id: "data-collection",
      title: "二、個人資料之收集類型 (Types of Data Collected)",
      titleEn: "Collecting and Using Your Personal Information",
      summary: "說明使用者主動提供之身分資料與系統自動收集之技術數據。",
      content: [
        "**1. 個人身分資料 (Personal Data)**：",
        "• 電子郵件信箱 (Email address)。",
        "• 姓名或暱稱 (First name and last name)。",
        "• 個人生理數值（如身高、體重、體脂率、目標體重、每日飲水與問卷答題記錄），此類資料優先於您的終端裝置本地加密儲存。",
        "",
        "**2. 使用數據與裝置資訊 (Usage Data)**：",
        "• 包括但不限於裝置 IP 位址、瀏覽器類型與版本、存取頁面、瀏覽時間、造訪日期、唯一裝置識別碼及其他診斷資料。",
        "• 透過行動裝置存取時，可能自動記錄行動裝置類型、作業系統、行動瀏覽器及相關診斷資訊。",
        "",
        "**3. 追蹤技術與 Cookie (Tracking Technologies)**：",
        "• 我們使用必要的快取及追蹤技術以維護服務正常運作、記住用戶偏好並改善使用體驗。"
      ]
    },
    {
      id: "data-usage",
      title: "三、個人資料之使用目的 (Use of Your Personal Data)",
      titleEn: "Use of Your Personal Data",
      summary: "清楚規範個人資料處理之法定與營運目的。",
      content: [
        "**提供與維護服務**：監控系統運作，提供每日 10 題問卷計算、資產負債表產出及飲食清單建議。",
        "**帳號與個人化管理**：管理使用者註冊設定，提供健康指標試算與定時提醒通知。",
        "**合約履行與交易管理**：處理應用程式單次下載、加購題庫或相關功能之合約執行。",
        "**通知與溝通聯絡**：透過電子郵件、簡訊、推播通知等方式發送系統更新、安全性警報與必要之功能通告。",
        "**行銷與促銷訊息（符合法律規範）**：在取得您同意或依法允許之範圍內，提供相關服務資訊；您可隨時點擊退訂連結或聯絡我們停止接收。",
        "**使用者請求處理**：即時回覆與處理您的客服詢問及技術支援需求。",
        "**業務轉讓與重組評估**：於合併、收購或資產轉讓等商業程序中，依法評估轉移必要之資料。",
        "**數據分析與服務改善**：進行去識別化趨勢分析，持續優化產品效能與使用體驗。"
      ]
    },
    {
      id: "data-sharing",
      title: "四、資料分享與第三方揭露 (Sharing Your Personal Data)",
      titleEn: "Sharing of Your Personal Data",
      summary: "絕不出售您的個人資訊，僅於特定合法情境下必要分享。",
      content: [
        "**受委託服務提供者 (Service Providers)**：僅與協助我們營運服務（如伺服器託管、技術分析、訊息傳遞）之專業服務商分享必要資料，且嚴格要求遵守保密義務。",
        "**關係企業 (Affiliates)**：若涉及關係企業或子公司，均要求嚴格遵守本隱私權政策規範。",
        "**商業轉讓 (Business Transfers)**：於合併、融資或收購程序中，於提供事前通知之原則下依法轉移。",
        "**經您明確同意 (With Your Consent)**：取得您事前書面或電子同意之特定目的揭露。"
      ]
    },
    {
      id: "sms-notice",
      title: "五、簡訊與即時訊息隱私聲明 (Text Messages / SMS Privacy)",
      titleEn: "Text Messages Privacy Notice",
      summary: "絕不將您的電話號碼出售或分享給第三方行銷。",
      content: [
        "• 若您選擇啟用簡訊或推播提醒（如活動提醒、安全驗證碼 OTP、重要狀態更新），我們僅儲存您提供的聯絡資訊及同意紀錄。",
        "• **零行銷共享保證**：絕不向任何第三方或關係企業出售、出租或分享您的手機號碼以用於行銷或推廣目的。",
        "• 隨時可透過回覆 **STOP** 取消訂閱，或回覆 **HELP** 尋求支援。",
        "• 接收簡訊提醒並非使用本服務之強制購買條件。"
      ]
    },
    {
      id: "retention",
      title: "六、資料保留期限與刪除機制 (Data Retention & Deletion)",
      titleEn: "Retention of Your Personal Data",
      summary: "明確規定各類資料最高 24 個月之保留上限與安全去識別化流程。",
      content: [
        "我們僅在達成收集目的所必需之期間內保留您的個人資料：",
        "• **使用者帳號資訊**：於帳號存續期間內保留，並於帳號終止/關閉後**最多保留 24 個月**以處理爭議或合約義務。",
        "• **客服紀錄與通訊對話**：自客服案件結案日起**最多保留 24 個月**，供服務品質追蹤及法律權益維護。",
        "• **使用統計與伺服器日誌**：**最多保留 24 個月**，供系統安全監控、除錯及功能優化分析。",
        "",
        "**到期處理程序**：保留期滿後，我們將執行安全刪除、覆寫備份或轉換為無法識別特定個人之永久匿名統計數據。"
      ]
    },
    {
      id: "user-rights",
      title: "七、使用者權利與資料刪除請求 (Your Rights & Deletion)",
      titleEn: "Delete Your Personal Data & User Rights",
      summary: "您擁有隨時查閱、修改、匯出或請求全面刪除個人資料的權利。",
      content: [
        "• **查閱與更正權**：您可隨時在應用程式的「個人設定」中檢視、修改個人資料與身體數值。",
        "• **刪除權 (Right to Delete)**：您有權請求我們刪除所收集之全部或部分個人資料。您可透過應用程式內設定或來信請求協助。",
        "• **本地資料控制權**：10qbs 提供一鍵清除本機快取與資料庫功能，確保您對設備端數據擁有絕對主控權。"
      ]
    },
    {
      id: "security-minors",
      title: "八、資訊安全與未成年人保護 (Security & Minors' Privacy)",
      titleEn: "Security and Children's Privacy",
      summary: "採用商用合理安全標準防護；本服務不以未滿 16 歲之人為對象。",
      content: [
        "• **資訊安全保障**：我們致力採用符合商業標準之加密與安全措施保護您的資料，惟請理解網際網路傳輸無法保證 100% 絕對安全。",
        "• **未成年人保護**：本服務不主動或故意收集未滿 16 歲未成年人之個人資料。若法定代理人發現未成年人未經同意提供資料，請隨時聯絡我們，我們將立即從系統中移除相關記錄。"
      ]
    },
    {
      id: "contact",
      title: "九、隱私權政策變更與聯絡窗口 (Changes & Contact Us)",
      titleEn: "Changes to this Policy and Contact Us",
      summary: "隨時掌握最新條款，並提供專屬客服信箱與線上官方條款連結。",
      content: [
        "• 我們可能不定期修訂本隱私權政策，任何重大變更將於應用程式內公告並更新上方日期。",
        "• **官方線上條款即時查閱 (Live Link)**：",
        "  https://www.freeprivacypolicy.com/live/463ed120-1afe-4220-83f3-0a80fd3f89f4",
        "• **官方聯絡信箱**：teatime.lucy@gmail.com",
        "• 若您對本隱私權政策有任何疑問、建議或權利行使請求，歡迎隨時與我們聯絡。"
      ]
    }
  ]
};
