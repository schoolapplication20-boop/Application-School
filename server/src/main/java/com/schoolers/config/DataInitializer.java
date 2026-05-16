package com.schoolers.config;

import com.schoolers.model.*;
import com.schoolers.repository.*;
import java.util.ArrayList;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@Configuration
public class DataInitializer {

    @Value("${app.owner.email:superadmin@schoolers.com}")
    private String ownerEmail;

    @Value("${app.owner.password:SuperAdmin@123}")
    private String ownerPassword;

    @Value("${app.owner.mobile:9000000000}")
    private String ownerMobile;

    @Bean
    @Order(2)
    CommandLineRunner initData(
            UserRepository userRepo,
            StudentRepository studentRepo,
            TeacherRepository teacherRepo,
            ClassRoomRepository classRoomRepo,
            FeeRepository feeRepo,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {

            // ── Role Hierarchy ─────────────────────────────────────────────────────
            // APPLICATION_OWNER : platform-level account, schoolId = NULL.
            //                     Manages all schools. Creates SUPER_ADMINs.
            // SUPER_ADMIN        : school-level owner, schoolId = NOT NULL.
            //                     Exactly ONE per school. Created by APPLICATION_OWNER.
            // ADMIN              : created by SUPER_ADMIN, scoped to their school.
            //
            // DataInitializer ONLY seeds APPLICATION_OWNER.
            // SUPER_ADMINs are created at runtime by APPLICATION_OWNER via the platform dashboard.
            // ──────────────────────────────────────────────────────────────────────
            userRepo.findByEmailIgnoreCase(ownerEmail).ifPresentOrElse(
                existing -> {
                    boolean changed = false;
                    if (!Boolean.TRUE.equals(existing.getIsActive())) {
                        existing.setIsActive(true);
                        changed = true;
                    }
                    if (!Boolean.FALSE.equals(existing.getFirstLogin())) {
                        existing.setFirstLogin(false);
                        changed = true;
                    }
                    // This seed account must always be APPLICATION_OWNER (platform-level).
                    // If somehow it was changed to SUPER_ADMIN or another role, correct it.
                    if (existing.getRole() != User.Role.APPLICATION_OWNER) {
                        existing.setRole(User.Role.APPLICATION_OWNER);
                        changed = true;
                        System.out.println("  [DataInitializer] Corrected role to APPLICATION_OWNER for: " + existing.getEmail());
                    }
                    // APPLICATION_OWNER must never have a schoolId — it is platform-level.
                    // A schoolId would incorrectly scope this account to a single school.
                    if (existing.getSchoolId() != null) {
                        existing.setSchoolId(null);
                        changed = true;
                        System.out.println("  [DataInitializer] Cleared schoolId from APPLICATION_OWNER account.");
                    }
                    if (changed) {
                        userRepo.save(existing);
                        System.out.println("  [DataInitializer] APPLICATION_OWNER account corrected.");
                    }
                },
                () -> {
                    userRepo.save(User.builder()
                            .name("Application Owner")
                            .email(ownerEmail)
                            .mobile(ownerMobile)
                            .password(passwordEncoder.encode(ownerPassword))
                            .role(User.Role.APPLICATION_OWNER)
                            .schoolId(null)
                            .isActive(true)
                            .firstLogin(false)
                            .build());
                    System.out.println("  [DataInitializer] APPLICATION_OWNER created -> " + ownerEmail);
                }
            );

            // ── Remove demo seed data ──────────────────────────────────────────
            removeDemoData(userRepo, studentRepo, teacherRepo, classRoomRepo);
        };
    }

    @Bean
    @Order(3)
    CommandLineRunner initChatbotFaqs(ChatbotFaqRepository faqRepo) {
        return args -> {
            // Always reseed so language columns stay up to date
            faqRepo.deleteAll();
            var faqs = new ArrayList<ChatbotFaq>();

            // ── GENERAL ───────────────────────────────────────────────────────
            faqs.add(faq("GENERAL","hello",
                "hello,hi,hey,hii,good morning,good afternoon,good evening,greet,start,begin",
                "Hello! 👋 I'm your My-Skoolz AI assistant.\n\nI can help you with:\n• Admissions  • Fees  • Attendance\n• Results  • Homework  • Transport\n• Timetable  • Leave Requests\n• Contact Support  • Login Help\n\nHow can I assist you today?",
                "नमस्ते! 👋 मैं आपका My-Skoolz AI सहायक हूं।\n\nमैं इनमें मदद कर सकता हूं:\n• प्रवेश  • शुल्क  • उपस्थिति\n• परिणाम  • गृहकार्य  • परिवहन\n• समय-सारणी  • अवकाश\n• सहायता  • लॉगिन सहायता\n\nआज मैं आपकी कैसे मदद करूं?",
                "నమస్కారం! 👋 నేను మీ My-Skoolz AI సహాయకుడిని.\n\nనేను ఇవి సహాయం చేయగలను:\n• అడ్మిషన్లు  • ఫీజులు  • హాజరు\n• ఫలితాలు  • హోంవర్క్  • రవాణా\n• టైమ్‌టేబుల్  • సెలవు\n• సహాయం  • లాగిన్ సహాయం\n\nనేను మీకు ఎలా సహాయపడగలను?"));

            faqs.add(faq("GENERAL","thank you",
                "thank you,thanks,thank,thankyou,ok thanks,great,awesome,done,bye,goodbye,ok,noted",
                "You're welcome! 😊 Feel free to ask anytime if you need more help. Have a great day!",
                "आपका स्वागत है! 😊 कभी भी मदद की जरूरत हो तो पूछें। आपका दिन शुभ हो!",
                "స్వాగతం! 😊 మీకు ఎప్పుడైనా సహాయం కావాలంటే అడగండి. మీకు మంచి రోజు కావాలని కోరుకుంటున్నాను!"));

            faqs.add(faq("GENERAL","help",
                "help,what can you do,options,menu,topics,list,guide",
                "I can help you with:\n\n📋 Admissions\n💰 Fees & Payments\n📅 Attendance\n📊 Results & Marks\n📚 Homework\n🚌 Transport\n🕐 Timetable\n🏖️ Leave Requests\n📞 Contact Support\n🔐 Login Help\n\nClick a button or type your question!",
                "मैं इनमें मदद कर सकता हूं:\n\n📋 प्रवेश\n💰 शुल्क और भुगतान\n📅 उपस्थिति\n📊 परिणाम और अंक\n📚 गृहकार्य\n🚌 परिवहन\n🕐 समय-सारणी\n🏖️ अवकाश अनुरोध\n📞 सहायता\n🔐 लॉगिन सहायता\n\nबटन पर क्लिक करें या अपना प्रश्न टाइप करें!",
                "నేను ఇవి సహాయం చేయగలను:\n\n📋 అడ్మిషన్లు\n💰 ఫీజులు & చెల్లింపులు\n📅 హాజరు\n📊 ఫలితాలు & మార్కులు\n📚 హోంవర్క్\n🚌 రవాణా\n🕐 టైమ్‌టేబుల్\n🏖️ సెలవు అభ్యర్థన\n📞 సహాయం\n🔐 లాగిన్ సహాయం\n\nపై బటన్ నొక్కండి లేదా మీ ప్రశ్న టైప్ చేయండి!"));

            // ── ADMISSIONS ────────────────────────────────────────────────────
            faqs.add(faq("ADMISSIONS","admissions",
                "admission,apply,new admission,enroll,enrollment,register,registration,new student,join,how to apply,apply now,admission process",
                "📋 Admissions:\n\n1. Visit the school office or fill the online form on our website\n2. Required documents:\n   • Birth certificate\n   • Previous year marksheet\n   • Transfer certificate\n   • Passport-size photos\n\nContact school admin for admission status or queries.",
                "📋 प्रवेश:\n\n1. विद्यालय कार्यालय में आएं या वेबसाइट पर ऑनलाइन फॉर्म भरें\n2. आवश्यक दस्तावेज:\n   • जन्म प्रमाण पत्र\n   • पिछले वर्ष की मार्कशीट\n   • स्थानांतरण प्रमाण पत्र\n   • पासपोर्ट साइज फोटो\n\nप्रवेश स्थिति के लिए स्कूल प्रशासक से संपर्क करें।",
                "📋 అడ్మిషన్లు:\n\n1. పాఠశాల కార్యాలయానికి వెళ్ళండి లేదా వెబ్‌సైట్‌లో ఆన్‌లైన్ ఫారం పూరించండి\n2. అవసరమైన పత్రాలు:\n   • జన్మ ధృవపత్రం\n   • గత సంవత్సరం మార్కుల పట్టిక\n   • బదిలీ ధృవపత్రం\n   • పాస్‌పోర్ట్ సైజ్ ఫోటోలు\n\nమరింత సమాచారానికి పాఠశాల అడ్మిన్‌ని సంప్రదించండి."));

            // ── FEES ──────────────────────────────────────────────────────────
            faqs.add(faq("FEES","fees",
                "fee,fees,fee details,school fee,tuition,fee info",
                "💰 Fee Help — I can assist with:\n\n• Pay Fees\n• Download Receipt\n• Payment History\n• Fee Structure\n• Pending / Due Fees\n\nType your specific query!",
                "💰 शुल्क सहायता — मैं इनमें मदद कर सकता हूं:\n\n• शुल्क भुगतान करें\n• रसीद डाउनलोड करें\n• भुगतान इतिहास\n• शुल्क संरचना\n• बकाया शुल्क\n\nअपना प्रश्न टाइप करें!",
                "💰 ఫీజు సహాయం — నేను ఇవి సహాయం చేయగలను:\n\n• ఫీజు చెల్లించండి\n• రసీదు డౌన్‌లోడ్ చేయండి\n• చెల్లింపు చరిత్ర\n• ఫీజు నిర్మాణం\n• పెండింగ్ ఫీజులు\n\nమీ ప్రశ్న టైప్ చేయండి!"));

            faqs.add(faq("FEES","pay fees",
                "pay fee,pay fees,make payment,fee payment,how to pay,online payment,pay now,submit fee,fee submit,fee pay",
                "💳 Pay Fees:\n\nDashboard → Fees → Pay Now\n\nSelect the fee type, enter the amount, and complete payment. Save your receipt afterwards.",
                "💳 शुल्क भुगतान:\n\nडैशबोर्ड → शुल्क → अभी भुगतान करें\n\nशुल्क प्रकार चुनें, राशि दर्ज करें और भुगतान पूरा करें। रसीद संभालकर रखें।",
                "💳 ఫీజు చెల్లింపు:\n\nడాష్‌బోర్డ్ → ఫీజులు → ఇప్పుడు చెల్లించండి\n\nఫీజు రకాన్ని ఎంచుకోండి, మొత్తం నమోదు చేయండి మరియు చెల్లింపు పూర్తి చేయండి. రసీదు సురక్షితంగా ఉంచుకోండి."));

            faqs.add(faq("FEES","download receipt",
                "receipt,download receipt,fee receipt,payment receipt,invoice,get receipt,print receipt",
                "🧾 Download Fee Receipt:\n\nDashboard → Fees → Payment History → Click on payment → Download Receipt\n\nContact admin if receipt is not available.",
                "🧾 शुल्क रसीद डाउनलोड करें:\n\nडैशबोर्ड → शुल्क → भुगतान इतिहास → भुगतान पर क्लिक करें → रसीद डाउनलोड करें\n\nरसीद उपलब्ध न हो तो प्रशासक से संपर्क करें।",
                "🧾 ఫీజు రసీదు డౌన్‌లోడ్:\n\nడాష్‌బోర్డ్ → ఫీజులు → చెల్లింపు చరిత్ర → చెల్లింపుపై క్లిక్ చేయండి → రసీదు డౌన్‌లోడ్ చేయండి\n\nరసీదు అందుబాటులో లేకపోతే అడ్మిన్‌ని సంప్రదించండి."));

            faqs.add(faq("FEES","fee structure",
                "fee structure,fee amount,total fee,annual fee,fee plan,how much fee,fee breakdown,class fee",
                "📊 Fee Structure:\n\nDashboard → Fees → Fee Structure\n\nFee is assigned by school admin based on your class. Contact admin for corrections or queries.",
                "📊 शुल्क संरचना:\n\nडैशबोर्ड → शुल्क → शुल्क संरचना\n\nशुल्क आपकी कक्षा के अनुसार स्कूल प्रशासक द्वारा निर्धारित किया जाता है। किसी भी सुधार के लिए प्रशासक से संपर्क करें।",
                "📊 ఫీజు నిర్మాణం:\n\nడాష్‌బోర్డ్ → ఫీజులు → ఫీజు నిర్మాణం\n\nఫీజు మీ తరగతి ఆధారంగా పాఠశాల అడ్మిన్ నిర్ణయిస్తారు. సవరణల కోసం అడ్మిన్‌ని సంప్రదించండి."));

            faqs.add(faq("FEES","payment history",
                "payment history,past payments,paid fees,fee history,previous payments,all payments,fee record",
                "📋 Payment History:\n\nDashboard → Fees → Payment History\n\nAll past payments are listed with date, amount, and receipt download option.",
                "📋 भुगतान इतिहास:\n\nडैशबोर्ड → शुल्क → भुगतान इतिहास\n\nसभी पिछले भुगतान तारीख, राशि और रसीद डाउनलोड विकल्प के साथ सूचीबद्ध हैं।",
                "📋 చెల్లింపు చరిత్ర:\n\nడాష్‌బోర్డ్ → ఫీజులు → చెల్లింపు చరిత్ర\n\nన్ అన్ని గత చెల్లింపులు తేదీ, మొత్తం మరియు రసీదు డౌన్‌లోడ్ ఎంపికతో జాబితా చేయబడ్డాయి."));

            faqs.add(faq("FEES","pending fees",
                "pending,due,balance,outstanding,overdue,pending fee,due amount,fee balance,fees due,unpaid",
                "⚠️ Pending Fees:\n\nDashboard → Fees\n\nAll outstanding dues are listed with due dates. Pay before the deadline to avoid penalties.",
                "⚠️ बकाया शुल्क:\n\nडैशबोर्ड → शुल्क\n\nसभी बकाया राशि नियत तारीखों के साथ सूचीबद्ध हैं। समय पर भुगतान करें।",
                "⚠️ పెండింగ్ ఫీజులు:\n\nడాష్‌బోర్డ్ → ఫీజులు\n\nన్ అన్ని పెండింగ్ మొత్తాలు గడువు తేదీలతో జాబితా చేయబడ్డాయి. గడువు తేదీకి ముందు చెల్లించండి."));

            // ── ATTENDANCE ────────────────────────────────────────────────────
            faqs.add(faq("ATTENDANCE","attendance",
                "attendance,present,absent,attendance record,my attendance,check attendance,view attendance,attendance percentage,daily attendance",
                "📅 Attendance:\n\nDashboard → Attendance\n\nView daily, weekly, and monthly attendance records along with your overall attendance percentage.",
                "📅 उपस्थिति:\n\nडैशबोर्ड → उपस्थिति\n\nदैनिक, साप्ताहिक और मासिक उपस्थिति रिकॉर्ड के साथ समग्र उपस्थिति प्रतिशत देखें।",
                "📅 హాజరు:\n\nడాష్‌బోర్డ్ → హాజరు\n\nరోజువారీ, వారపు మరియు నెలవారీ హాజరు రికార్డులతో మీ మొత్తం హాజరు శాతాన్ని చూడండి."));

            faqs.add(faq("ATTENDANCE","mark attendance",
                "mark attendance,take attendance,attendance marking,record attendance,student attendance,class attendance",
                "✅ Mark Attendance (Teachers):\n\nDashboard → Attendance → Mark Attendance\n\nSelect class and date, mark each student present or absent, then submit.",
                "✅ उपस्थिति दर्ज करें (शिक्षक):\n\nडैशबोर्ड → उपस्थिति → उपस्थिति दर्ज करें\n\nकक्षा और तारीख चुनें, प्रत्येक छात्र को उपस्थित या अनुपस्थित चिह्नित करें, फिर सबमिट करें।",
                "✅ హాజరు నమోదు (ఉపాధ్యాయులు):\n\nడాష్‌బోర్డ్ → హాజరు → హాజరు నమోదు\n\nతరగతి మరియు తేదీ ఎంచుకోండి, ప్రతి విద్యార్థిని హాజరు లేదా గైర్హాజరు గుర్తించండి, తర్వాత సమర్పించండి."));

            // ── RESULTS ───────────────────────────────────────────────────────
            faqs.add(faq("RESULTS","results",
                "result,results,marks,grade,grades,score,scores,exam result,my result,check result,view result",
                "📊 Results & Marks:\n\nDashboard → Examination → Results\n\nView subject-wise marks, total scores, and grades for each exam.",
                "📊 परिणाम और अंक:\n\nडैशबोर्ड → परीक्षा → परिणाम\n\nप्रत्येक परीक्षा के लिए विषय-वार अंक, कुल स्कोर और ग्रेड देखें।",
                "📊 ఫలితాలు & మార్కులు:\n\nడాష్‌బోర్డ్ → పరీక్ష → ఫలితాలు\n\nప్రతి పరీక్షకు సబ్జెక్ట్-వారీ మార్కులు, మొత్తం స్కోరు మరియు గ్రేడ్ చూడండి."));

            faqs.add(faq("RESULTS","report card",
                "report card,marksheet,progress report,report,grade card,progress card",
                "📄 Report Card:\n\nDashboard → Examination → Certificates\n\nDownload or print your report card. Contact admin if it has not been generated yet.",
                "📄 रिपोर्ट कार्ड:\n\nडैशबोर्ड → परीक्षा → प्रमाण पत्र\n\nरिपोर्ट कार्ड डाउनलोड या प्रिंट करें। अभी तक उपलब्ध न हो तो प्रशासक से संपर्क करें।",
                "📄 రిపోర్ట్ కార్డ్:\n\nడాష్‌బోర్డ్ → పరీక్ష → సర్టిఫికెట్లు\n\nరిపోర్ట్ కార్డ్ డౌన్‌లోడ్ చేయండి లేదా ప్రింట్ తీయండి. ఇంకా అందుబాటులో లేకపోతే అడ్మిన్‌ని సంప్రదించండి."));

            faqs.add(faq("RESULTS","exam schedule",
                "exam schedule,examination schedule,exam dates,exam timetable,test schedule,upcoming exam,next exam,exam time",
                "📅 Exam Schedule:\n\nDashboard → Examination → Exam Schedule\n\nSubject name, date, time, and duration are listed here.",
                "📅 परीक्षा कार्यक्रम:\n\nडैशबोर्ड → परीक्षा → परीक्षा कार्यक्रम\n\nविषय का नाम, परीक्षा की तारीख, समय और अवधि यहां सूचीबद्ध है।",
                "📅 పరీక్ష షెడ్యూల్:\n\nడాష్‌బోర్డ్ → పరీక్ష → పరీక్ష షెడ్యూల్\n\nసబ్జెక్ట్ పేరు, పరీక్ష తేదీ, సమయం మరియు వ్యవధి ఇక్కడ జాబితా చేయబడ్డాయి."));

            faqs.add(faq("RESULTS","hall ticket",
                "hall ticket,admit card,exam card,admit slip,examination pass",
                "🎟️ Hall Ticket:\n\nDashboard → Examination → Hall Tickets\n\nDownload your hall ticket before the exam. Contact admin if it is not yet generated.",
                "🎟️ हॉल टिकट:\n\nडैशबोर्ड → परीक्षा → हॉल टिकट\n\nपरीक्षा से पहले हॉल टिकट डाउनलोड करें। अभी तक उपलब्ध न हो तो प्रशासक से संपर्क करें।",
                "🎟️ హాల్ టికెట్:\n\nడాష్‌బోర్డ్ → పరీక్ష → హాల్ టికెట్లు\n\nపరీక్షకు ముందు హాల్ టికెట్ డౌన్‌లోడ్ చేయండి. ఇంకా అందుబాటులో లేకపోతే అడ్మిన్‌ని సంప్రదించండి."));

            // ── HOMEWORK ──────────────────────────────────────────────────────
            faqs.add(faq("HOMEWORK","homework",
                "homework,home work,assignment,task,pending homework,class work,due work,subject assignment",
                "📚 Homework:\n\nDashboard → Homework\n\nAll assignments from teachers are listed with due dates and instructions. Submit before the deadline.",
                "📚 गृहकार्य:\n\nडैशबोर्ड → गृहकार्य\n\nशिक्षकों के सभी असाइनमेंट नियत तारीखों और निर्देशों के साथ सूचीबद्ध हैं। समय सीमा से पहले जमा करें।",
                "📚 హోంవర్క్:\n\nడాష్‌బోర్డ్ → హోంవర్క్\n\nఉపాధ్యాయుల అన్ని అసైన్‌మెంట్లు గడువు తేదీలు మరియు సూచనలతో జాబితా చేయబడ్డాయి. గడువు తేదీకి ముందు సమర్పించండి."));

            faqs.add(faq("HOMEWORK","submit homework",
                "submit homework,upload homework,homework submission,submit assignment,how to submit homework",
                "📤 Submit Homework:\n\nDashboard → Homework → Click on the assignment → Upload your completed work\n\nMake sure to submit before the due date.",
                "📤 गृहकार्य जमा करें:\n\nडैशबोर्ड → गृहकार्य → असाइनमेंट पर क्लिक करें → अपना कार्य अपलोड करें\n\nनियत तारीख से पहले अवश्य जमा करें।",
                "📤 హోంవర్క్ సమర్పించండి:\n\nడాష్‌బోర్డ్ → హోంవర్క్ → అసైన్‌మెంట్‌పై క్లిక్ చేయండి → మీ పని అప్‌లోడ్ చేయండి\n\nగడువు తేదీకి ముందు తప్పకుండా సమర్పించండి."));

            // ── TIMETABLE ─────────────────────────────────────────────────────
            faqs.add(faq("TIMETABLE","timetable",
                "timetable,time table,schedule,class schedule,class timing,period,periods,weekly schedule,class time,subject schedule",
                "🕐 Timetable:\n\nDashboard → Timetable\n\nView all subjects, teachers, and timings for each day of the week.",
                "🕐 समय-सारणी:\n\nडैशबोर्ड → समय-सारणी\n\nसप्ताह के प्रत्येक दिन के लिए सभी विषय, शिक्षक और समय देखें।",
                "🕐 టైమ్‌టేబుల్:\n\nడాష్‌బోర్డ్ → టైమ్‌టేబుల్\n\nవారంలో ప్రతి రోజు అన్ని సబ్జెక్టులు, ఉపాధ్యాయులు మరియు సమయాలు చూడండి."));

            // ── TRANSPORT ─────────────────────────────────────────────────────
            faqs.add(faq("TRANSPORT","transport",
                "transport,bus,vehicle,route,pick up,drop,bus route,school bus,bus stop,bus number,bus timing",
                "🚌 Transport Details:\n\nDashboard → Transport\n\nView your assigned bus number, route, stop name, and pickup/drop timings.",
                "🚌 परिवहन विवरण:\n\nडैशबोर्ड → परिवहन\n\nअपना निर्धारित बस नंबर, मार्ग, स्टॉप का नाम और पिकअप/ड्रॉप का समय देखें।",
                "🚌 రవాణా వివరాలు:\n\nడాష్‌బోర్డ్ → రవాణా\n\nమీకు కేటాయించిన బస్సు నంబరు, మార్గం, స్టాప్ పేరు మరియు పికప్/డ్రాప్ సమయాలు చూడండి."));

            // ── LEAVE ─────────────────────────────────────────────────────────
            faqs.add(faq("LEAVE","leave request",
                "leave,leave request,apply leave,sick leave,medical leave,absence,absent request,casual leave,take leave,leave application",
                "🏖️ Apply for Leave:\n\nDashboard → Leave Management → Apply Leave\n\nEnter:\n• Start date & End date\n• Reason for leave\n• Submit for approval\n\nTeacher/admin will approve or reject.",
                "🏖️ अवकाश के लिए आवेदन:\n\nडैशबोर्ड → अवकाश प्रबंधन → अवकाश आवेदन\n\nदर्ज करें:\n• प्रारंभ तिथि और समाप्ति तिथि\n• अवकाश का कारण\n• अनुमोदन के लिए जमा करें\n\nशिक्षक/प्रशासक अनुमोदित या अस्वीकार करेंगे।",
                "🏖️ సెలవు కోసం దరఖాస్తు:\n\nడాష్‌బోర్డ్ → సెలవు నిర్వహణ → సెలవు దరఖాస్తు\n\nనమోదు చేయండి:\n• ప్రారంభ తేదీ & ముగింపు తేదీ\n• సెలవు కారణం\n• ఆమోదం కోసం సమర్పించండి\n\nఉపాధ్యాయుడు/అడ్మిన్ ఆమోదిస్తారు లేదా తిరస్కరిస్తారు."));

            faqs.add(faq("LEAVE","leave status",
                "leave status,leave approved,leave pending,check leave,my leaves,leave history,is leave approved,leave rejected",
                "📋 Leave Status:\n\nDashboard → Leave Management → My Leaves\n\nStatus shows: Pending / Approved / Rejected.\nContact admin for urgent approvals.",
                "📋 अवकाश स्थिति:\n\nडैशबोर्ड → अवकाश प्रबंधन → मेरे अवकाश\n\nस्थिति दिखाता है: लंबित / अनुमोदित / अस्वीकृत।\nत्वरित अनुमोदन के लिए प्रशासक से संपर्क करें।",
                "📋 సెలవు స్థితి:\n\nడాష్‌బోర్డ్ → సెలవు నిర్వహణ → నా సెలవులు\n\nస్థితి చూపిస్తుంది: పెండింగ్ / ఆమోదించబడింది / తిరస్కరించబడింది.\nత్వరిత ఆమోదానికి అడ్మిన్‌ని సంప్రదించండి."));

            // ── CONTACT ───────────────────────────────────────────────────────
            faqs.add(faq("CONTACT","contact support",
                "contact,support,help desk,complaint,issue,problem,technical,trouble,not working,contact us",
                "📞 Contact Support:\n\n• Message admin: Dashboard → Messages\n• Visit the school office in person\n• Email your school admin directly\n\nWe respond within 24 hours. We're here to help!",
                "📞 सहायता से संपर्क:\n\n• संदेश प्रशासक: डैशबोर्ड → संदेश\n• व्यक्तिगत रूप से स्कूल कार्यालय जाएं\n• अपने स्कूल प्रशासक को सीधे ईमेल करें\n\nहम 24 घंटे के भीतर जवाब देते हैं!",
                "📞 సహాయానికి సంప్రదించండి:\n\n• అడ్మిన్‌కు సందేశం: డాష్‌బోర్డ్ → సందేశాలు\n• పాఠశాల కార్యాలయానికి వ్యక్తిగతంగా వెళ్ళండి\n• పాఠశాల అడ్మిన్‌కు నేరుగా ఇమెయిల్ చేయండి\n\nమేము 24 గంటల్లో సమాధానమిస్తాం!"));

            faqs.add(faq("CONTACT","contact admin",
                "contact admin,reach admin,message admin,admin contact,principal,office,school office",
                "💬 Message Admin:\n\nDashboard → Messages → Select Admin → Type your message\n\nYou can communicate with admin, teachers, or parents through the Messages feature.",
                "💬 प्रशासक को संदेश:\n\nडैशबोर्ड → संदेश → प्रशासक चुनें → अपना संदेश टाइप करें\n\nआप संदेश सुविधा के माध्यम से प्रशासक, शिक्षक या अभिभावकों से संवाद कर सकते हैं।",
                "💬 అడ్మిన్‌కు సందేశం:\n\nడాష్‌బోర్డ్ → సందేశాలు → అడ్మిన్ ఎంచుకోండి → మీ సందేశం టైప్ చేయండి\n\nసందేశాల ఫీచర్ ద్వారా మీరు అడ్మిన్, ఉపాధ్యాయులు లేదా తల్లిదండ్రులతో సంభాషించవచ్చు."));

            // ── LOGIN ─────────────────────────────────────────────────────────
            faqs.add(faq("LOGIN","login help",
                "login,sign in,can't login,unable to login,login problem,access denied,log in,login issue,not able to login,login error",
                "🔐 Login Help:\n\n1. Use your registered email & password\n2. Check Caps Lock is off\n3. Clear browser cache and retry\n4. Use 'Forgot Password' if needed\n5. Contact admin if still unable to login",
                "🔐 लॉगिन सहायता:\n\n1. अपना पंजीकृत ईमेल और पासवर्ड उपयोग करें\n2. जांचें कि Caps Lock बंद है\n3. ब्राउज़र कैश साफ करें और पुनः प्रयास करें\n4. जरूरत पड़े तो 'पासवर्ड भूल गए' उपयोग करें\n5. फिर भी समस्या हो तो प्रशासक से संपर्क करें",
                "🔐 లాగిన్ సహాయం:\n\n1. మీ నమోదు ఇమెయిల్ & పాస్‌వర్డ్ ఉపయోగించండి\n2. Caps Lock ఆఫ్ చేయబడిందని నిర్ధారించుకోండి\n3. బ్రౌజర్ కాష్ క్లియర్ చేసి మళ్ళీ ప్రయత్నించండి\n4. అవసరమైతే 'పాస్‌వర్డ్ మర్చిపోయారా' ఉపయోగించండి\n5. ఇంకా సమస్య ఉంటే అడ్మిన్‌ని సంప్రదించండి"));

            faqs.add(faq("LOGIN","forgot password",
                "forgot password,reset password,password reset,lost password,password forgotten,can't remember password,otp,password otp",
                "🔑 Reset Password:\n\n1. Click 'Forgot Password' on the login page\n2. Enter your registered email\n3. Check your email for the OTP (check spam too)\n4. Enter OTP → Set your new password\n\nContact admin if email is not received.",
                "🔑 पासवर्ड रीसेट:\n\n1. लॉगिन पेज पर 'पासवर्ड भूल गए' क्लिक करें\n2. अपना पंजीकृत ईमेल दर्ज करें\n3. ईमेल में OTP जांचें (स्पैम भी देखें)\n4. OTP दर्ज करें → नया पासवर्ड सेट करें\n\nईमेल न मिले तो प्रशासक से संपर्क करें।",
                "🔑 పాస్‌వర్డ్ రీసెట్:\n\n1. లాగిన్ పేజీలో 'పాస్‌వర్డ్ మర్చిపోయారా' క్లిక్ చేయండి\n2. మీ నమోదు ఇమెయిల్ నమోదు చేయండి\n3. ఇమెయిల్‌లో OTP చెక్ చేయండి (స్పామ్ కూడా చూడండి)\n4. OTP నమోదు చేయండి → కొత్త పాస్‌వర్డ్ సెట్ చేయండి\n\nఇమెయిల్ రాకపోతే అడ్మిన్‌ని సంప్రదించండి."));

            faqs.add(faq("LOGIN","change password",
                "change password,update password,new password,password change,modify password,set password",
                "🔒 Change Password:\n\nDashboard → Profile → Change Password\n\nEnter your current password, then set a strong new password with letters and numbers.",
                "🔒 पासवर्ड बदलें:\n\nडैशबोर्ड → प्रोफाइल → पासवर्ड बदलें\n\nवर्तमान पासवर्ड दर्ज करें, फिर अक्षरों और संख्याओं के साथ एक मजबूत नया पासवर्ड सेट करें।",
                "🔒 పాస్‌వర్డ్ మార్చండి:\n\nడాష్‌బోర్డ్ → ప్రొఫైల్ → పాస్‌వర్డ్ మార్చండి\n\nప్రస్తుత పాస్‌వర్డ్ నమోదు చేయండి, తర్వాత అక్షరాలు మరియు సంఖ్యలతో బలమైన కొత్త పాస్‌వర్డ్ సెట్ చేయండి."));

            faqRepo.saveAll(faqs);
            System.out.println("  [DataInitializer] Seeded " + faqs.size() + " chatbot FAQs (EN + HI + TE).");
        };
    }

    private ChatbotFaq faq(String category, String question, String keywords,
                            String answer, String answerHi, String answerTe) {
        return ChatbotFaq.builder()
            .category(category).question(question).keywords(keywords)
            .answer(answer).answerHi(answerHi).answerTe(answerTe)
            .build();
    }

    private void removeDemoData(
            UserRepository userRepo,
            StudentRepository studentRepo,
            TeacherRepository teacherRepo,
            ClassRoomRepository classRoomRepo
    ) {
        // 1. Seeded teachers and their linked User accounts
        List<String> seededTeacherEmails = List.of("rajesh@schoolers.com", "priya@schoolers.com");
        for (String email : seededTeacherEmails) {
            userRepo.findByEmail(email).ifPresent(u -> {
                teacherRepo.findAll().stream()
                    .filter(t -> t.getUser() != null && t.getUser().getId().equals(u.getId()))
                    .forEach(t -> {
                        teacherRepo.deleteById(t.getId());
                        System.out.println("  [DataInitializer] Removed seeded teacher: " + email);
                    });
                userRepo.deleteById(u.getId());
            });
        }

        // 2. Other seeded users
        for (String email : List.of("admin@schoolers.com", "suresh@schoolers.com", "meena@schoolers.com")) {
            userRepo.findByEmail(email).ifPresent(u -> {
                userRepo.deleteById(u.getId());
                System.out.println("  [DataInitializer] Removed seeded user: " + email);
            });
        }

        // 3. Seeded students
        studentRepo.findAll().stream()
            .filter(s -> "10A001".equals(s.getRollNumber()) || "9A001".equals(s.getRollNumber()))
            .forEach(s -> {
                studentRepo.deleteById(s.getId());
                System.out.println("  [DataInitializer] Removed seeded student: " + s.getRollNumber());
            });

        // 4. Seeded classrooms
        classRoomRepo.findAll().stream()
            .filter(c -> ("10-A".equals(c.getName()) && "Rajesh Kumar".equals(c.getTeacherName()))
                      || ("9-A".equals(c.getName())  && "Priya Sharma".equals(c.getTeacherName())))
            .forEach(c -> {
                classRoomRepo.deleteById(c.getId());
                System.out.println("  [DataInitializer] Removed seeded classroom: " + c.getName());
            });
    }
}
