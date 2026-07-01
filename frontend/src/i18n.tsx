import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'en' | 'hi' | 'pa' | 'mr';
type Entry = { en: string; hi: string; pa: string; mr: string };

const dict: Record<string, Entry> = {
  // ── app / common ──
  'app.tagline':       { en: 'Sell Smart, Earn Better', hi: 'समझदारी से बेचें, बेहतर कमाएँ', pa: 'ਸਮਝਦਾਰੀ ਨਾਲ ਵੇਚੋ, ਵੱਧ ਕਮਾਓ', mr: 'हुशारीने विका, अधिक कमवा' },
  'app.subtitle':      { en: 'AI-powered mandi price intelligence for smart farming decisions', hi: 'स्मार्ट खेती के फैसलों के लिए एआई-आधारित मंडी मूल्य जानकारी', pa: 'ਸਮਾਰਟ ਖੇਤੀ ਫੈਸਲਿਆਂ ਲਈ ਏਆਈ-ਆਧਾਰਿਤ ਮੰਡੀ ਮੁੱਲ ਜਾਣਕਾਰੀ', mr: 'स्मार्ट शेती निर्णयांसाठी एआय-आधारित मंडी किंमत माहिती' },
  'common.getStarted': { en: 'Get Started', hi: 'शुरू करें', pa: 'ਸ਼ੁਰੂ ਕਰੋ', mr: 'सुरू करा' },
  'common.selectLang': { en: 'Select Language', hi: 'भाषा चुनें', pa: 'ਭਾਸ਼ਾ ਚੁਣੋ', mr: 'भाषा निवडा' },
  'common.loading':    { en: 'Loading live data…', hi: 'लाइव डेटा लोड हो रहा है…', pa: 'ਲਾਈਵ ਡਾਟਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…', mr: 'लाइव्ह डेटा लोड होत आहे…' },
  'common.perQuintal': { en: 'per quintal', hi: 'प्रति क्विंटल', pa: 'ਪ੍ਰਤੀ ਕੁਇੰਟਲ', mr: 'प्रति क्विंटल' },
  'common.details':    { en: 'Details', hi: 'विवरण', pa: 'ਵੇਰਵਾ', mr: 'तपशील' },
  'common.dataError':  { en: 'Could not load data', hi: 'डेटा लोड नहीं हुआ', pa: 'ਡਾਟਾ ਲੋਡ ਨਹੀਂ ਹੋਇਆ', mr: 'डेटा लोड झाला नाही' },
  'common.search':     { en: 'Search', hi: 'खोजें', pa: 'ਖੋਜੋ', mr: 'शोधा' },
  'common.comingSoon': { en: 'Coming soon', hi: 'जल्द आ रहा है', pa: 'ਜਲਦੀ ਆ ਰਿਹਾ', mr: 'लवकरच' },
  'common.back':       { en: 'Back', hi: 'वापस', pa: 'ਵਾਪਸ', mr: 'मागे' },

  // ── bottom nav ──
  'nav.home':    { en: 'Home', hi: 'होम', pa: 'ਹੋਮ', mr: 'होम' },
  'nav.predict': { en: 'Predict', hi: 'पूर्वानुमान', pa: 'ਭਵਿੱਖਬਾਣੀ', mr: 'अंदाज' },
  'nav.alerts':  { en: 'Alerts', hi: 'अलर्ट', pa: 'ਅਲਰਟ', mr: 'सूचना' },
  'nav.profile': { en: 'Profile', hi: 'प्रोफ़ाइल', pa: 'ਪ੍ਰੋਫਾਈਲ', mr: 'प्रोफाइल' },

  // ── home ──
  'home.welcome':       { en: 'Welcome Back', hi: 'वापसी पर स्वागत है', pa: 'ਜੀ ਆਇਆਂ ਨੂੰ', mr: 'पुन्हा स्वागत आहे' },
  'home.location':      { en: 'Location', hi: 'स्थान', pa: 'ਟਿਕਾਣਾ', mr: 'ठिकाण' },
  'home.selectedCrop':  { en: 'Selected Crop', hi: 'चयनित फसल', pa: 'ਚੁਣੀ ਫਸਲ', mr: 'निवडलेले पीक' },
  'home.latestPrice':   { en: 'Latest Mandi Price', hi: 'नवीनतम मंडी भाव', pa: 'ਤਾਜ਼ਾ ਮੰਡੀ ਭਾਅ', mr: 'ताजे मंडी भाव' },
  'home.asOf':          { en: 'As of', hi: 'दिनांक', pa: 'ਮਿਤੀ', mr: 'दिनांक' },
  'home.fromPrev':      { en: 'from previous day', hi: 'पिछले दिन से', pa: 'ਪਿਛਲੇ ਦਿਨ ਤੋਂ', mr: 'मागील दिवसापासून' },
  'home.aiRec':         { en: 'AI Recommendation', hi: 'एआई सिफारिश', pa: 'ਏਆਈ ਸਿਫਾਰਸ਼', mr: 'एआय शिफारस' },
  'home.confident':     { en: 'Confident', hi: 'विश्वास', pa: 'ਭਰੋਸਾ', mr: 'विश्वास' },
  'home.bestDay':       { en: 'Best Day', hi: 'सर्वोत्तम दिन', pa: 'ਸਭ ਤੋਂ ਵਧੀਆ ਦਿਨ', mr: 'सर्वोत्तम दिवस' },
  'home.trendForecast': { en: 'Price Trend & Forecast', hi: 'मूल्य रुझान और पूर्वानुमान', pa: 'ਮੁੱਲ ਰੁਝਾਨ ਤੇ ਭਵਿੱਖਬਾਣੀ', mr: 'किंमत कल आणि अंदाज' },
  'home.recentActual':  { en: 'Recent actual', hi: 'हाल का वास्तविक', pa: 'ਹਾਲੀਆ ਅਸਲ', mr: 'अलीकडील वास्तविक' },
  'home.forecast7':     { en: '7-day forecast', hi: '7-दिन पूर्वानुमान', pa: '7-ਦਿਨ ਭਵਿੱਖਬਾਣੀ', mr: '7-दिवस अंदाज' },
  'home.compareMandis': { en: 'Compare Mandis', hi: 'मंडी तुलना', pa: 'ਮੰਡੀ ਤੁਲਨਾ', mr: 'मंडी तुलना' },
  'home.mandiInfo':     { en: 'Mandi Info', hi: 'मंडी जानकारी', pa: 'ਮੰਡੀ ਜਾਣਕਾਰੀ', mr: 'मंडी माहिती' },
  'home.detailedPred':  { en: 'Detailed Prediction', hi: 'विस्तृत पूर्वानुमान', pa: 'ਵਿਸਤ੍ਰਿਤ ਭਵਿੱਖਬਾਣੀ', mr: 'सविस्तर अंदाज' },
  'home.myCrops':       { en: 'My Crops', hi: 'मेरी फसलें', pa: 'ਮੇਰੀਆਂ ਫਸਲਾਂ', mr: 'माझी पिके' },
  'home.holdFor':       { en: 'Hold for', hi: 'रुकें', pa: 'ਰੁਕੋ', mr: 'थांबा' },
  'home.days':          { en: 'days for', hi: 'दिन के लिए', pa: 'ਦਿਨ ਲਈ', mr: 'दिवसांसाठी' },
  'home.day':           { en: 'day for', hi: 'दिन के लिए', pa: 'ਦਿਨ ਲਈ', mr: 'दिवसासाठी' },
  'home.sellNow':       { en: 'Sell now — price not expected to rise', hi: 'अभी बेचें — कीमत बढ़ने की उम्मीद नहीं', pa: 'ਹੁਣ ਵੇਚੋ — ਭਾਅ ਵਧਣ ਦੀ ਉਮੀਦ ਨਹੀਂ', mr: 'आता विका — किंमत वाढण्याची शक्यता नाही' },

  // ── login ──
  'login.welcome':     { en: 'Welcome Back', hi: 'वापसी पर स्वागत है', pa: 'ਜੀ ਆਇਆਂ ਨੂੰ', mr: 'पुन्हा स्वागत आहे' },
  'login.enterMobile': { en: 'Enter your mobile number to continue', hi: 'जारी रखने के लिए अपना मोबाइल नंबर दर्ज करें', pa: 'ਜਾਰੀ ਰੱਖਣ ਲਈ ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ', mr: 'सुरू ठेवण्यासाठी तुमचा मोबाइल नंबर टाका' },
  'login.mobile':      { en: 'Mobile Number', hi: 'मोबाइल नंबर', pa: 'ਮੋਬਾਈਲ ਨੰਬਰ', mr: 'मोबाइल नंबर' },
  'login.sendOtp':     { en: 'Send OTP', hi: 'ओटीपी भेजें', pa: 'ਓਟੀਪੀ ਭੇਜੋ', mr: 'ओटीपी पाठवा' },
  'login.voice':       { en: 'Voice Assistant Available', hi: 'आवाज सहायक उपलब्ध', pa: 'ਆਵਾਜ਼ ਸਹਾਇਕ ਉਪਲਬਧ', mr: 'व्हॉइस सहाय्यक उपलब्ध' },
  'login.enterOtp':    { en: 'Enter OTP', hi: 'ओटीपी दर्ज करें', pa: 'ਓਟੀਪੀ ਦਰਜ ਕਰੋ', mr: 'ओटीपी टाका' },
  'login.sentTo':      { en: 'Sent to', hi: 'भेजा गया', pa: 'ਭੇਜਿਆ ਗਿਆ', mr: 'पाठवले' },
  'login.verifyOtp':   { en: 'Verify OTP', hi: 'सत्यापित करें', pa: 'ਪੁਸ਼ਟੀ ਕਰੋ', mr: 'पडताळणी करा' },
  'login.resendOtp':   { en: 'Resend OTP', hi: 'फिर से भेजें', pa: 'ਮੁੜ ਭੇਜੋ', mr: 'पुन्हा पाठवा' },
  'login.selectRole':  { en: 'Select Your Role', hi: 'अपनी भूमिका चुनें', pa: 'ਆਪਣੀ ਭੂਮਿਕਾ ਚੁਣੋ', mr: 'तुमची भूमिका निवडा' },
  'login.chooseUse':   { en: "Choose how you'll use MandiQ", hi: 'चुनें कि आप MandiQ कैसे उपयोग करेंगे', pa: 'ਚੁਣੋ ਕਿ ਤੁਸੀਂ MandiQ ਕਿਵੇਂ ਵਰਤੋਗੇ', mr: 'तुम्ही MandiQ कसे वापराल ते निवडा' },
  'login.farmer':      { en: 'Farmer', hi: 'किसान', pa: 'ਕਿਸਾਨ', mr: 'शेतकरी' },
  'login.trader':      { en: 'Trader', hi: 'व्यापारी', pa: 'ਵਪਾਰੀ', mr: 'व्यापारी' },

  // ── prediction ──
  'pred.title':        { en: 'Price Prediction', hi: 'मूल्य पूर्वानुमान', pa: 'ਮੁੱਲ ਭਵਿੱਖਬਾਣੀ', mr: 'किंमत अंदाज' },
  'pred.selectedCrop': { en: 'Selected Crop', hi: 'चयनित फसल', pa: 'ਚੁਣੀ ਫਸਲ', mr: 'निवडलेले पीक' },
  'pred.location':     { en: 'Location', hi: 'स्थान', pa: 'ਟਿਕਾਣਾ', mr: 'ठिकाण' },
  'pred.generating':   { en: 'Generating forecast…', hi: 'पूर्वानुमान बन रहा है…', pa: 'ਭਵਿੱਖਬਾਣੀ ਬਣ ਰਹੀ ਹੈ…', mr: 'अंदाज तयार होत आहे…' },
  'pred.forecast':     { en: '7-Day Price Forecast', hi: '7-दिन मूल्य पूर्वानुमान', pa: '7-ਦਿਨ ਮੁੱਲ ਭਵਿੱਖਬਾਣੀ', mr: '7-दिवस किंमत अंदाज' },
  'pred.withCI':       { en: 'With confidence interval', hi: 'विश्वास अंतराल के साथ', pa: 'ਭਰੋਸਾ ਅੰਤਰਾਲ ਨਾਲ', mr: 'विश्वास अंतरासह' },
  'pred.bestSellDay':  { en: 'Best selling day', hi: 'सर्वोत्तम बिक्री दिन', pa: 'ਸਭ ਤੋਂ ਵਧੀਆ ਵਿਕਰੀ ਦਿਨ', mr: 'सर्वोत्तम विक्री दिवस' },
  'pred.costBenefit':  { en: 'Cost-Benefit Analysis', hi: 'लागत-लाभ विश्लेषण', pa: 'ਲਾਗਤ-ਲਾਭ ਵਿਸ਼ਲੇਸ਼ਣ', mr: 'खर्च-लाभ विश्लेषण' },
  'pred.storageCost':  { en: 'Storage Cost', hi: 'भंडारण लागत', pa: 'ਭੰਡਾਰਨ ਲਾਗਤ', mr: 'साठवण खर्च' },
  'pred.expGain':      { en: 'Expected Price Gain', hi: 'अपेक्षित मूल्य लाभ', pa: 'ਉਮੀਦ ਮੁੱਲ ਲਾਭ', mr: 'अपेक्षित किंमत लाभ' },
  'pred.netGain':      { en: 'Net Expected Gain', hi: 'शुद्ध अपेक्षित लाभ', pa: 'ਸ਼ੁੱਧ ਉਮੀਦ ਲਾਭ', mr: 'निव्वळ अपेक्षित लाभ' },
  'pred.noHold':       { en: 'Holding gives no net benefit — selling now looks better.', hi: 'रुकने से शुद्ध लाभ नहीं — अभी बेचना बेहतर लगता है।', pa: 'ਰੁਕਣ ਨਾਲ ਸ਼ੁੱਧ ਲਾਭ ਨਹੀਂ — ਹੁਣ ਵੇਚਣਾ ਬਿਹਤਰ ਹੈ।', mr: 'थांबल्याने निव्वळ लाभ नाही — आता विकणे चांगले.' },
  'pred.weatherImpact':{ en: 'Weather Impact', hi: 'मौसम प्रभाव', pa: 'ਮੌਸਮ ਪ੍ਰਭਾਵ', mr: 'हवामान परिणाम' },
  'pred.weatherText':  { en: 'Weather signals (rainfall, temperature) are used inside the model.', hi: 'मौसम संकेत (वर्षा, तापमान) मॉडल में उपयोग होते हैं।', pa: 'ਮੌਸਮ ਸੰਕੇਤ (ਮੀਂਹ, ਤਾਪਮਾਨ) ਮਾਡਲ ਵਿੱਚ ਵਰਤੇ ਜਾਂਦੇ ਹਨ।', mr: 'हवामान संकेत (पाऊस, तापमान) मॉडेलमध्ये वापरले जातात.' },
  'pred.demand':       { en: 'Demand Level', hi: 'मांग स्तर', pa: 'ਮੰਗ ਪੱਧਰ', mr: 'मागणी पातळी' },
  'pred.high':         { en: 'High', hi: 'अधिक', pa: 'ਵੱਧ', mr: 'जास्त' },
  'pred.demandText':   { en: 'Seasonal demand expected to rise', hi: 'मौसमी मांग बढ़ने की संभावना', pa: 'ਮੌਸਮੀ ਮੰਗ ਵਧਣ ਦੀ ਸੰਭਾਵਨਾ', mr: 'हंगामी मागणी वाढण्याची शक्यता' },
  'pred.confidence':   { en: 'Prediction Confidence', hi: 'पूर्वानुमान विश्वास', pa: 'ਭਵਿੱਖਬਾਣੀ ਭਰੋਸਾ', mr: 'अंदाज विश्वास' },
  'pred.confText':     { en: 'Confidence is derived from the model prediction spread.', hi: 'विश्वास मॉडल की भविष्यवाणी से निकाला जाता है।', pa: 'ਭਰੋਸਾ ਮਾਡਲ ਦੀ ਭਵਿੱਖਬਾਣੀ ਤੋਂ ਨਿਕਲਦਾ ਹੈ।', mr: 'विश्वास मॉडेलच्या अंदाजावरून काढला जातो.' },
  'pred.wasAccurate':  { en: 'Was this prediction accurate?', hi: 'क्या यह पूर्वानुमान सही था?', pa: 'ਕੀ ਇਹ ਭਵਿੱਖਬਾਣੀ ਸਹੀ ਸੀ?', mr: 'हा अंदाज अचूक होता का?' },
  'pred.yes':          { en: 'Yes', hi: 'हाँ', pa: 'ਹਾਂ', mr: 'होय' },
  'pred.no':           { en: 'No', hi: 'नहीं', pa: 'ਨਹੀਂ', mr: 'नाही' },
  'pred.submit':       { en: 'Submit Feedback', hi: 'प्रतिक्रिया भेजें', pa: 'ਫੀਡਬੈਕ ਭੇਜੋ', mr: 'अभिप्राय पाठवा' },
  'pred.noModel':      { en: 'Model must be trained and backend running.', hi: 'मॉडल ट्रेन होना चाहिए और बैकएंड चालू।', pa: 'ਮਾਡਲ ਟ੍ਰੇਨ ਹੋਣਾ ਚਾਹੀਦਾ ਤੇ ਬੈਕਐਂਡ ਚਾਲੂ।', mr: 'मॉडेल प्रशिक्षित आणि बॅकएंड चालू हवे.' },

  // ── mandi info ──
  'info.title':     { en: 'Mandi Information', hi: 'मंडी जानकारी', pa: 'ਮੰਡੀ ਜਾਣਕਾਰੀ', mr: 'मंडी माहिती' },
  'info.loading':   { en: 'Loading prices…', hi: 'कीमतें लोड हो रही हैं…', pa: 'ਭਾਅ ਲੋਡ ਹੋ ਰਹੇ ਹਨ…', mr: 'किंमती लोड होत आहेत…' },
  'info.rising':    { en: 'Rising', hi: 'बढ़ रहा', pa: 'ਵਧ ਰਿਹਾ', mr: 'वाढत आहे' },
  'info.falling':   { en: 'Falling', hi: 'गिर रहा', pa: 'ਡਿੱਗ ਰਿਹਾ', mr: 'घटत आहे' },
  'info.stable':    { en: 'Stable', hi: 'स्थिर', pa: 'ਸਥਿਰ', mr: 'स्थिर' },
  'info.all':       { en: 'All', hi: 'सभी', pa: 'ਸਾਰੇ', mr: 'सर्व' },
  'info.cropsList': { en: 'crops listed', hi: 'फसलें सूचीबद्ध', pa: 'ਫਸਲਾਂ ਸੂਚੀਬੱਧ', mr: 'पिके सूचीबद्ध' },
  'info.noChange':  { en: 'No change', hi: 'कोई बदलाव नहीं', pa: 'ਕੋਈ ਬਦਲਾਅ ਨਹੀਂ', mr: 'बदल नाही' },

  // ── mandi compare ──
  'cmp.title':       { en: 'Compare Mandis', hi: 'मंडी तुलना', pa: 'ਮੰਡੀ ਤੁਲਨਾ', mr: 'मंडी तुलना' },
  'cmp.selectedCrop':{ en: 'Selected Crop', hi: 'चयनित फसल', pa: 'ਚੁਣੀ ਫਸਲ', mr: 'निवडलेले पीक' },
  'cmp.comparing':   { en: 'Comparing', hi: 'तुलना', pa: 'ਤੁਲਨਾ', mr: 'तुलना' },
  'cmp.of':          { en: 'of', hi: 'में से', pa: 'ਵਿੱਚੋਂ', mr: 'पैकी' },
  'cmp.banner':      { en: 'Price & arrivals are live; transport is an estimate', hi: 'कीमत और आवक लाइव; परिवहन अनुमानित', pa: 'ਭਾਅ ਤੇ ਆਮਦ ਲਾਈਵ; ਟ੍ਰਾਂਸਪੋਰਟ ਅਨੁਮਾਨਿਤ', mr: 'किंमत व आवक लाइव्ह; वाहतूक अंदाजे' },
  'cmp.loading':     { en: 'Loading live data…', hi: 'लाइव डेटा लोड हो रहा है…', pa: 'ਲਾਈਵ ਡਾਟਾ ਲੋਡ ਹੋ ਰਿਹਾ…', mr: 'लाइव्ह डेटा लोड होत आहे…' },
  'cmp.mandiPrice':  { en: 'Mandi Price', hi: 'मंडी भाव', pa: 'ਮੰਡੀ ਭਾਅ', mr: 'मंडी भाव' },
  'cmp.transportEst':{ en: 'Transport Cost (est.)', hi: 'परिवहन लागत (अनुमान)', pa: 'ਟ੍ਰਾਂਸਪੋਰਟ ਲਾਗਤ (ਅੰਦਾਜ਼ਾ)', mr: 'वाहतूक खर्च (अंदाजे)' },
  'cmp.netProfit':   { en: 'Net Profit', hi: 'शुद्ध लाभ', pa: 'ਸ਼ੁੱਧ ਲਾਭ', mr: 'निव्वळ नफा' },
  'cmp.priceAsOf':   { en: 'Price as of', hi: 'भाव दिनांक', pa: 'ਭਾਅ ਮਿਤੀ', mr: 'भाव दिनांक' },
  'cmp.noData':      { en: 'No data for this crop yet', hi: 'इस फसल का डेटा अभी नहीं', pa: 'ਇਸ ਫਸਲ ਦਾ ਡਾਟਾ ਅਜੇ ਨਹੀਂ', mr: 'या पिकाचा डेटा अजून नाही' },
  'cmp.distance':    { en: 'Distance', hi: 'दूरी', pa: 'ਦੂਰੀ', mr: 'अंतर' },
  'cmp.transport':   { en: 'Transport', hi: 'परिवहन', pa: 'ਟ੍ਰਾਂਸਪੋਰਟ', mr: 'वाहतूक' },
  'cmp.demand':      { en: 'Demand', hi: 'मांग', pa: 'ਮੰਗ', mr: 'मागणी' },
  'cmp.arrivals':    { en: 'Arrivals', hi: 'आवक', pa: 'ਆਮਦ', mr: 'आवक' },
  'cmp.route':       { en: 'Route', hi: 'रास्ता', pa: 'ਰਸਤਾ', mr: 'मार्ग' },
  'cmp.quickComp':   { en: 'Quick Comparison', hi: 'त्वरित तुलना', pa: 'ਤੇਜ਼ ਤੁਲਨਾ', mr: 'त्वरित तुलना' },
  'cmp.high':        { en: 'High', hi: 'अधिक', pa: 'ਵੱਧ', mr: 'जास्त' },
  'cmp.medium':      { en: 'Medium', hi: 'मध्यम', pa: 'ਦਰਮਿਆਨਾ', mr: 'मध्यम' },
  'cmp.low':         { en: 'Low', hi: 'कम', pa: 'ਘੱਟ', mr: 'कमी' },
  'cmp.best':        { en: 'Best', hi: 'सर्वोत्तम', pa: 'ਵਧੀਆ', mr: 'सर्वोत्तम' },

  // ── crops ──
  'crops.title':     { en: 'Select Crop', hi: 'फसल चुनें', pa: 'ਫਸਲ ਚੁਣੋ', mr: 'पीक निवडा' },
  'crops.available': { en: 'crops available', hi: 'फसलें उपलब्ध', pa: 'ਫਸਲਾਂ ਉਪਲਬਧ', mr: 'पिके उपलब्ध' },
  'crops.seasonal':  { en: 'Seasonal', hi: 'मौसमी', pa: 'ਮੌਸਮੀ', mr: 'हंगामी' },
  'crops.rising':    { en: 'Rising', hi: 'बढ़ रहा', pa: 'ਵਧ ਰਿਹਾ', mr: 'वाढत' },
  'crops.falling':   { en: 'Falling', hi: 'गिर रहा', pa: 'ਡਿੱਗ ਰਿਹਾ', mr: 'घटत' },
  'crops.stableT':   { en: 'Stable', hi: 'स्थिर', pa: 'ਸਥਿਰ', mr: 'स्थिर' },

  // ── alerts ──
  'alerts.title':      { en: 'Smart Alerts', hi: 'स्मार्ट अलर्ट', pa: 'ਸਮਾਰਟ ਅਲਰਟ', mr: 'स्मार्ट सूचना' },
  'alerts.createTitle':{ en: 'Create Target Price Alert', hi: 'लक्ष्य मूल्य अलर्ट बनाएं', pa: 'ਟੀਚਾ ਮੁੱਲ ਅਲਰਟ ਬਣਾਓ', mr: 'लक्ष्य किंमत सूचना तयार करा' },
  'alerts.crop':       { en: 'Crop', hi: 'फसल', pa: 'ਫਸਲ', mr: 'पीक' },
  'alerts.targetPrice':{ en: 'Target Price (₹/quintal)', hi: 'लक्ष्य मूल्य (₹/क्विंटल)', pa: 'ਟੀਚਾ ਮੁੱਲ (₹/ਕੁਇੰਟਲ)', mr: 'लक्ष्य किंमत (₹/क्विंटल)' },
  'alerts.enterTarget':{ en: 'Enter target price', hi: 'लक्ष्य मूल्य दर्ज करें', pa: 'ਟੀਚਾ ਮੁੱਲ ਦਰਜ ਕਰੋ', mr: 'लक्ष्य किंमत टाका' },
  'alerts.createBtn':  { en: 'Create Alert', hi: 'अलर्ट बनाएं', pa: 'ਅਲਰਟ ਬਣਾਓ', mr: 'सूचना तयार करा' },
  'alerts.myAlerts':   { en: 'My Alerts', hi: 'मेरे अलर्ट', pa: 'ਮੇਰੇ ਅਲਰਟ', mr: 'माझ्या सूचना' },
  'alerts.none':       { en: 'No alerts yet. Tap + to create one.', hi: 'अभी कोई अलर्ट नहीं। + दबाकर बनाएं।', pa: 'ਅਜੇ ਕੋਈ ਅਲਰਟ ਨਹੀਂ। + ਦਬਾ ਕੇ ਬਣਾਓ।', mr: 'अजून सूचना नाहीत. + दाबून तयार करा.' },
  'alerts.created':    { en: 'Created', hi: 'बनाया', pa: 'ਬਣਾਇਆ', mr: 'तयार केले' },
  'alerts.channels':   { en: 'Notification Channels', hi: 'सूचना चैनल', pa: 'ਸੂਚਨਾ ਚੈਨਲ', mr: 'सूचना चॅनेल' },
  'alerts.appNotif':   { en: 'App Notifications', hi: 'ऐप सूचनाएं', pa: 'ਐਪ ਸੂਚਨਾਵਾਂ', mr: 'ऍप सूचना' },
  'alerts.sms':        { en: 'SMS Alerts', hi: 'SMS अलर्ट', pa: 'SMS ਅਲਰਟ', mr: 'SMS सूचना' },
  'alerts.whatsapp':   { en: 'WhatsApp Messages', hi: 'WhatsApp संदेश', pa: 'WhatsApp ਸੁਨੇਹੇ', mr: 'WhatsApp संदेश' },
  'alerts.types':      { en: 'Alert Types', hi: 'अलर्ट प्रकार', pa: 'ਅਲਰਟ ਕਿਸਮਾਂ', mr: 'सूचना प्रकार' },
  'alerts.targetTitle':{ en: 'Target Price Alert', hi: 'लक्ष्य मूल्य अलर्ट', pa: 'ਟੀਚਾ ਮੁੱਲ ਅਲਰਟ', mr: 'लक्ष्य किंमत सूचना' },
  'alerts.targetDesc': { en: 'Get notified when price reaches your target', hi: 'जब कीमत लक्ष्य पर पहुंचे तो सूचना पाएं', pa: 'ਜਦੋਂ ਭਾਅ ਟੀਚੇ ਤੇ ਪਹੁੰਚੇ ਤਾਂ ਸੂਚਨਾ ਪਾਓ', mr: 'किंमत लक्ष्यावर पोहोचल्यावर सूचना मिळवा' },
  'alerts.bestDayTitle':{ en: 'Best Selling Day Alert', hi: 'सर्वोत्तम दिन अलर्ट', pa: 'ਸਭ ਤੋਂ ਵਧੀਆ ਦਿਨ ਅਲਰਟ', mr: 'सर्वोत्तम दिवस सूचना' },
  'alerts.bestDayDesc':{ en: 'AI recommends the best day to sell', hi: 'एआई सर्वोत्तम बिक्री दिन सुझाता है', pa: 'ਏਆਈ ਸਭ ਤੋਂ ਵਧੀਆ ਵਿਕਰੀ ਦਿਨ ਸੁਝਾਉਂਦਾ ਹੈ', mr: 'एआय सर्वोत्तम विक्री दिवस सुचवते' },
  'alerts.mandiTitle': { en: 'Better Mandi Price Alert', hi: 'बेहतर मंडी अलर्ट', pa: 'ਬਿਹਤਰ ਮੰਡੀ ਅਲਰਟ', mr: 'चांगली मंडी सूचना' },
  'alerts.mandiDesc':  { en: 'Alert when nearby mandi has better price', hi: 'जब पास की मंडी में बेहतर भाव हो', pa: 'ਜਦੋਂ ਨੇੜਲੀ ਮੰਡੀ ਵਿੱਚ ਬਿਹਤਰ ਭਾਅ ਹੋਵੇ', mr: 'जवळच्या मंडीत चांगला भाव असल्यास' },
  'alerts.arrivalTitle':{ en: 'Arrival Spike Alert', hi: 'आगमन वृद्धि अलर्ट', pa: 'ਆਮਦ ਵਾਧਾ ਅਲਰਟ', mr: 'आवक वाढ सूचना' },
  'alerts.arrivalDesc':{ en: 'High arrivals may reduce prices', hi: 'अधिक आवक से भाव गिर सकते हैं', pa: 'ਵੱਧ ਆਮਦ ਨਾਲ ਭਾਅ ਡਿੱਗ ਸਕਦੇ ਹਨ', mr: 'जास्त आवकेने भाव घटू शकतात' },
  'alerts.weatherTitle':{ en: 'Weather-Based Alert', hi: 'मौसम आधारित अलर्ट', pa: 'ਮੌਸਮ ਆਧਾਰਿਤ ਅਲਰਟ', mr: 'हवामान आधारित सूचना' },
  'alerts.weatherDesc':{ en: 'Weather impact on crop prices', hi: 'फसल मूल्य पर मौसम प्रभाव', pa: 'ਫਸਲ ਮੁੱਲ ਤੇ ਮੌਸਮ ਪ੍ਰਭਾਵ', mr: 'पीक किंमतीवर हवामान परिणाम' },

  // ── profile ──
  'profile.farmer':     { en: 'Farmer', hi: 'किसान', pa: 'ਕਿਸਾਨ', mr: 'शेतकरी' },
  'profile.totalSavings':{ en: 'Total Savings', hi: 'कुल बचत', pa: 'ਕੁੱਲ ਬੱਚਤ', mr: 'एकूण बचत' },
  'profile.avgGain':    { en: 'Avg Gain', hi: 'औसत लाभ', pa: 'ਔਸਤ ਲਾਭ', mr: 'सरासरी लाभ' },
  'profile.accuracy':   { en: 'Accuracy', hi: 'सटीकता', pa: 'ਸ਼ੁੱਧਤਾ', mr: 'अचूकता' },
  'profile.language':   { en: 'Language', hi: 'भाषा', pa: 'ਭਾਸ਼ਾ', mr: 'भाषा' },
  'profile.incomeCalc': { en: 'Income Calculator', hi: 'आय कैलकुलेटर', pa: 'ਆਮਦਨ ਕੈਲਕੁਲੇਟਰ', mr: 'उत्पन्न कॅल्क्युलेटर' },
  'profile.support':    { en: 'Support Chat', hi: 'सहायता चैट', pa: 'ਸਹਾਇਤਾ ਚੈਟ', mr: 'सहाय्य चॅट' },
  'profile.voice':      { en: 'Voice Assistant', hi: 'आवाज सहायक', pa: 'ਆਵਾਜ਼ ਸਹਾਇਕ', mr: 'व्हॉइस सहाय्यक' },
  'profile.insights':   { en: 'Market Insights', hi: 'बाजार जानकारी', pa: 'ਬਾਜ਼ਾਰ ਜਾਣਕਾਰੀ', mr: 'बाजार माहिती' },
  'profile.advCalc':    { en: 'Advanced Income Calculator', hi: 'उन्नत आय कैलकुलेटर', pa: 'ਉੱਨਤ ਆਮਦਨ ਕੈਲਕੁਲੇਟਰ', mr: 'प्रगत उत्पन्न कॅल्क्युलेटर' },
  'profile.quantity':   { en: 'Quantity (Quintals)', hi: 'मात्रा (क्विंटल)', pa: 'ਮਾਤਰਾ (ਕੁਇੰਟਲ)', mr: 'प्रमाण (क्विंटल)' },
  'profile.expPrice':   { en: 'Expected Price (₹/quintal)', hi: 'अपेक्षित मूल्य (₹/क्विंटल)', pa: 'ਉਮੀਦ ਮੁੱਲ (₹/ਕੁਇੰਟਲ)', mr: 'अपेक्षित किंमत (₹/क्विंटल)' },
  'profile.transport':  { en: 'Transport Cost (₹)', hi: 'परिवहन लागत (₹)', pa: 'ਟ੍ਰਾਂਸਪੋਰਟ ਲਾਗਤ (₹)', mr: 'वाहतूक खर्च (₹)' },
  'profile.storage':    { en: 'Storage Cost (₹)', hi: 'भंडारण लागत (₹)', pa: 'ਭੰਡਾਰਨ ਲਾਗਤ (₹)', mr: 'साठवण खर्च (₹)' },
  'profile.spoilage':   { en: 'Spoilage Loss (₹/quintal)', hi: 'खराब होने की हानि (₹/क्विंटल)', pa: 'ਖਰਾਬ ਹੋਣ ਦਾ ਨੁਕਸਾਨ (₹/ਕੁਇੰਟਲ)', mr: 'खराब होण्याची हानी (₹/क्विंटल)' },
  'profile.mandiFees':  { en: 'Mandi Fees (₹)', hi: 'मंडी शुल्क (₹)', pa: 'ਮੰਡੀ ਫੀਸ (₹)', mr: 'मंडी शुल्क (₹)' },
  'profile.calcBtn':    { en: 'Calculate Net Profit', hi: 'शुद्ध लाभ गणना करें', pa: 'ਸ਼ੁੱਧ ਲਾਭ ਗਣਨਾ ਕਰੋ', mr: 'निव्वळ नफा मोजा' },
  'profile.estProfit':  { en: 'Estimated Net Profit', hi: 'अनुमानित शुद्ध लाभ', pa: 'ਅਨੁਮਾਨਿਤ ਸ਼ੁੱਧ ਲਾਭ', mr: 'अंदाजित निव्वळ नफा' },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const LangContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>((localStorage.getItem('lang') as Lang) || 'en');
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem('lang', l); };
  const t = (key: string): string => {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang] ?? entry.en;
  };
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}