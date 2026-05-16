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
            if (faqRepo.count() > 0) return; // already seeded

            var faqs = new ArrayList<ChatbotFaq>();

            // ── GENERAL ───────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("GENERAL").question("hello")
                .keywords("hello,hi,hey,hii,good morning,good afternoon,good evening,greet,start,begin")
                .answer("Hello! 👋 I'm your My-Skoolz AI assistant.\n\nI can help you with:\n• Admissions  • Fees  • Attendance\n• Results  • Homework  • Transport\n• Timetable  • Leave Requests\n• Contact Support  • Login Help\n\nHow can I assist you today?").build());

            faqs.add(ChatbotFaq.builder().category("GENERAL").question("thank you")
                .keywords("thank you,thanks,thank,thankyou,ok thanks,great,awesome,done,bye,goodbye,ok,noted")
                .answer("You're welcome! 😊 Feel free to ask anytime if you need more help. Have a great day!").build());

            faqs.add(ChatbotFaq.builder().category("GENERAL").question("help")
                .keywords("help,what can you do,options,menu,topics,list,guide")
                .answer("I can help you with:\n\n📋 Admissions\n💰 Fees & Payments\n📅 Attendance\n📊 Results & Marks\n📚 Homework\n🚌 Transport\n🕐 Timetable\n🏖️ Leave Requests\n📞 Contact Support\n🔐 Login Help\n\nClick a button or type your question!").build());

            // ── ADMISSIONS ────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("ADMISSIONS").question("admissions")
                .keywords("admission,apply,new admission,enroll,enrollment,register,registration,new student,join,how to apply,apply now,admission process")
                .answer("📋 Admissions:\n\n1. Visit the school office or fill the online form on our website\n2. Required documents:\n   • Birth certificate\n   • Previous year marksheet\n   • Transfer certificate\n   • Passport-size photos\n\nContact school admin for admission status or queries.").build());

            // ── FEES ──────────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("FEES").question("fees")
                .keywords("fee,fees,fee details,school fee,tuition,fee info")
                .answer("💰 Fee Help — I can assist with:\n\n• Pay Fees\n• Download Receipt\n• Payment History\n• Fee Structure\n• Pending / Due Fees\n\nType your specific query!").build());

            faqs.add(ChatbotFaq.builder().category("FEES").question("pay fees")
                .keywords("pay fee,pay fees,make payment,fee payment,how to pay,online payment,pay now,submit fee,fee submit,fee pay")
                .answer("💳 Pay Fees:\n\nDashboard → Fees → Pay Now\n\nSelect the fee type, enter the amount, and complete payment. Save your receipt afterwards.").build());

            faqs.add(ChatbotFaq.builder().category("FEES").question("download receipt")
                .keywords("receipt,download receipt,fee receipt,payment receipt,invoice,get receipt,print receipt")
                .answer("🧾 Download Fee Receipt:\n\nDashboard → Fees → Payment History → Click on payment → Download Receipt\n\nContact admin if receipt is not available.").build());

            faqs.add(ChatbotFaq.builder().category("FEES").question("fee structure")
                .keywords("fee structure,fee amount,total fee,annual fee,fee plan,how much fee,fee breakdown,class fee")
                .answer("📊 Fee Structure:\n\nDashboard → Fees → Fee Structure\n\nFee is assigned by school admin based on your class. Contact admin for corrections or queries.").build());

            faqs.add(ChatbotFaq.builder().category("FEES").question("payment history")
                .keywords("payment history,past payments,paid fees,fee history,previous payments,all payments,fee record")
                .answer("📋 Payment History:\n\nDashboard → Fees → Payment History\n\nAll past payments are listed with date, amount, and receipt download option.").build());

            faqs.add(ChatbotFaq.builder().category("FEES").question("pending fees")
                .keywords("pending,due,balance,outstanding,overdue,pending fee,due amount,fee balance,fees due,unpaid")
                .answer("⚠️ Pending Fees:\n\nDashboard → Fees\n\nAll outstanding dues are listed with due dates. Pay before the deadline to avoid penalties.").build());

            // ── ATTENDANCE ────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("ATTENDANCE").question("attendance")
                .keywords("attendance,present,absent,attendance record,my attendance,check attendance,view attendance,attendance percentage,daily attendance")
                .answer("📅 Attendance:\n\nDashboard → Attendance\n\nView daily, weekly, and monthly attendance records along with your overall attendance percentage.").build());

            faqs.add(ChatbotFaq.builder().category("ATTENDANCE").question("mark attendance")
                .keywords("mark attendance,take attendance,attendance marking,record attendance,student attendance,class attendance")
                .answer("✅ Mark Attendance (Teachers):\n\nDashboard → Attendance → Mark Attendance\n\nSelect class and date, mark each student present or absent, then submit.").build());

            // ── RESULTS ───────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("RESULTS").question("results")
                .keywords("result,results,marks,grade,grades,score,scores,exam result,my result,check result,view result")
                .answer("📊 Results & Marks:\n\nDashboard → Examination → Results\n\nView subject-wise marks, total scores, and grades for each exam.").build());

            faqs.add(ChatbotFaq.builder().category("RESULTS").question("report card")
                .keywords("report card,marksheet,progress report,report,grade card,progress card")
                .answer("📄 Report Card:\n\nDashboard → Examination → Certificates\n\nDownload or print your report card. Contact admin if it has not been generated yet.").build());

            faqs.add(ChatbotFaq.builder().category("RESULTS").question("exam schedule")
                .keywords("exam schedule,examination schedule,exam dates,exam timetable,test schedule,upcoming exam,next exam,exam time")
                .answer("📅 Exam Schedule:\n\nDashboard → Examination → Exam Schedule\n\nSubject name, date, time, and duration are listed here.").build());

            faqs.add(ChatbotFaq.builder().category("RESULTS").question("hall ticket")
                .keywords("hall ticket,admit card,exam card,admit slip,examination pass")
                .answer("🎟️ Hall Ticket:\n\nDashboard → Examination → Hall Tickets\n\nDownload your hall ticket before the exam. Contact admin if it is not yet generated.").build());

            // ── HOMEWORK ──────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("HOMEWORK").question("homework")
                .keywords("homework,home work,assignment,task,pending homework,class work,due work,subject assignment")
                .answer("📚 Homework:\n\nDashboard → Homework\n\nAll assignments from teachers are listed with due dates and instructions. Submit before the deadline.").build());

            faqs.add(ChatbotFaq.builder().category("HOMEWORK").question("submit homework")
                .keywords("submit homework,upload homework,homework submission,submit assignment,how to submit homework")
                .answer("📤 Submit Homework:\n\nDashboard → Homework → Click on the assignment → Upload your completed work\n\nMake sure to submit before the due date.").build());

            // ── TIMETABLE ─────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("TIMETABLE").question("timetable")
                .keywords("timetable,time table,schedule,class schedule,class timing,period,periods,weekly schedule,class time,subject schedule")
                .answer("🕐 Timetable:\n\nDashboard → Timetable\n\nView all subjects, teachers, and timings for each day of the week.").build());

            // ── TRANSPORT ─────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("TRANSPORT").question("transport")
                .keywords("transport,bus,vehicle,route,pick up,drop,bus route,school bus,bus stop,bus number,bus timing")
                .answer("🚌 Transport Details:\n\nDashboard → Transport\n\nView your assigned bus number, route, stop name, and pickup/drop timings.").build());

            // ── LEAVE ─────────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("LEAVE").question("leave request")
                .keywords("leave,leave request,apply leave,sick leave,medical leave,absence,absent request,casual leave,take leave,leave application")
                .answer("🏖️ Apply for Leave:\n\nDashboard → Leave Management → Apply Leave\n\nEnter:\n• Start date & End date\n• Reason for leave\n• Submit for approval\n\nTeacher/admin will approve or reject.").build());

            faqs.add(ChatbotFaq.builder().category("LEAVE").question("leave status")
                .keywords("leave status,leave approved,leave pending,check leave,my leaves,leave history,is leave approved,leave rejected")
                .answer("📋 Leave Status:\n\nDashboard → Leave Management → My Leaves\n\nStatus shows: Pending / Approved / Rejected.\nContact admin for urgent approvals.").build());

            // ── CONTACT ───────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("CONTACT").question("contact support")
                .keywords("contact,support,help desk,complaint,issue,problem,technical,trouble,not working,contact us")
                .answer("📞 Contact Support:\n\n• Message admin: Dashboard → Messages\n• Visit the school office in person\n• Email your school admin directly\n\nWe respond within 24 hours. We're here to help!").build());

            faqs.add(ChatbotFaq.builder().category("CONTACT").question("contact admin")
                .keywords("contact admin,reach admin,message admin,admin contact,principal,office,school office")
                .answer("💬 Message Admin:\n\nDashboard → Messages → Select Admin → Type your message\n\nYou can communicate with admin, teachers, or parents through the Messages feature.").build());

            // ── LOGIN ─────────────────────────────────────────────────────────
            faqs.add(ChatbotFaq.builder().category("LOGIN").question("login help")
                .keywords("login,sign in,can't login,unable to login,login problem,access denied,log in,login issue,not able to login,login error")
                .answer("🔐 Login Help:\n\n1. Use your registered email & password\n2. Check Caps Lock is off\n3. Clear browser cache and retry\n4. Use 'Forgot Password' if needed\n5. Contact admin if still unable to login").build());

            faqs.add(ChatbotFaq.builder().category("LOGIN").question("forgot password")
                .keywords("forgot password,reset password,password reset,lost password,password forgotten,can't remember password,otp,password otp")
                .answer("🔑 Reset Password:\n\n1. Click 'Forgot Password' on the login page\n2. Enter your registered email\n3. Check your email for the OTP (check spam too)\n4. Enter OTP → Set your new password\n\nContact admin if email is not received.").build());

            faqs.add(ChatbotFaq.builder().category("LOGIN").question("change password")
                .keywords("change password,update password,new password,password change,modify password,set password")
                .answer("🔒 Change Password:\n\nDashboard → Profile → Change Password\n\nEnter your current password, then set a strong new password with letters and numbers.").build());

            faqRepo.saveAll(faqs);
            System.out.println("  [DataInitializer] Seeded " + faqs.size() + " chatbot FAQs.");
        };
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
