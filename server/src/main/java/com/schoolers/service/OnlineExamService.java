package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OnlineExamService {

    @Autowired
    private OnlineExamRepository examRepository;

    @Autowired
    private OnlineExamQuestionRepository questionRepository;

    @Autowired
    private OnlineExamAttemptRepository attemptRepository;

    @Autowired
    private OnlineExamAnswerRepository answerRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    // ── Helpers ────────────────────────────────────────────────────────────────

    public Teacher resolveTeacher(org.springframework.security.core.Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .flatMap(u -> teacherRepository.findByUserId(u.getId()))
                .orElse(null);
    }

    public Student resolveStudent(org.springframework.security.core.Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .flatMap(u -> studentRepository.findByStudentUserId(u.getId()))
                .orElse(null);
    }

    private void refreshTotalMarks(Long examId) {
        Integer total = questionRepository.sumMarksByExamId(examId);
        int totalMarks = total != null ? total : 0;
        examRepository.findById(examId).ifPresent(exam -> {
            exam.setTotalMarks(totalMarks);
            examRepository.save(exam);
        });
    }

    // ── Teacher: Exams CRUD ────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<OnlineExam> createExam(Teacher teacher, Map<String, Object> body) {
        String title = (String) body.get("title");
        if (title == null || title.isBlank()) return ApiResponse.error("Title is required.");
        if (title.length() > 200) return ApiResponse.error("Title must be 200 characters or fewer.");

        String subject = (String) body.getOrDefault("subject", "");
        String className = (String) body.getOrDefault("className", "");
        String section = (String) body.getOrDefault("section", "");
        String instructions = (String) body.getOrDefault("instructions", "");
        String dueDateTimeStr = (String) body.get("dueDateTime");

        LocalDateTime dueDateTime = null;
        if (dueDateTimeStr != null && !dueDateTimeStr.isBlank()) {
            try {
                dueDateTime = LocalDateTime.parse(dueDateTimeStr);
            } catch (Exception e) {
                return ApiResponse.error("Invalid dueDateTime format. Use ISO-8601 (e.g. 2026-07-01T10:00:00).");
            }
        }

        OnlineExam exam = OnlineExam.builder()
                .title(title.trim())
                .subject(subject != null ? subject.trim() : "")
                .className(className != null ? className.trim() : "")
                .section(section != null ? section.trim() : "")
                .schoolId(teacher.getSchoolId())
                .teacherId(teacher.getId())
                .teacherName(teacher.getName())
                .dueDateTime(dueDateTime)
                .instructions(instructions != null ? instructions.trim() : "")
                .status(OnlineExam.Status.DRAFT)
                .totalMarks(0)
                .build();

        return ApiResponse.success("Exam created.", examRepository.save(exam));
    }

    public ApiResponse<List<Map<String, Object>>> listTeacherExams(Teacher teacher) {
        List<OnlineExam> exams = examRepository.findByTeacherIdAndSchoolIdOrderByCreatedAtDesc(
                teacher.getId(), teacher.getSchoolId());
        return ApiResponse.success(exams.stream()
                .map(e -> enrichExam(e, true))
                .collect(Collectors.toList()));
    }

    public ApiResponse<Map<String, Object>> getTeacherExam(Teacher teacher, Long examId) {
        return examRepository.findById(examId)
                .filter(e -> teacher.getId().equals(e.getTeacherId()) && teacher.getSchoolId().equals(e.getSchoolId()))
                .map(e -> ApiResponse.success(enrichExamWithQuestions(e, true)))
                .orElseGet(() -> ApiResponse.error("Exam not found or access denied."));
    }

    @Transactional
    public ApiResponse<OnlineExam> updateExam(Teacher teacher, Long examId, Map<String, Object> body) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty() || !teacher.getId().equals(opt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        OnlineExam exam = opt.get();
        // Only allow full field updates if DRAFT; allow dueDateTime update even if PUBLISHED
        boolean isDraft = exam.getStatus() == OnlineExam.Status.DRAFT;

        if (body.containsKey("dueDateTime")) {
            String dueDateTimeStr = (String) body.get("dueDateTime");
            if (dueDateTimeStr == null || dueDateTimeStr.isBlank()) {
                exam.setDueDateTime(null);
            } else {
                try {
                    exam.setDueDateTime(LocalDateTime.parse(dueDateTimeStr));
                } catch (Exception e) {
                    return ApiResponse.error("Invalid dueDateTime format.");
                }
            }
        }

        if (isDraft) {
            if (body.containsKey("title")) {
                String title = (String) body.get("title");
                if (title == null || title.isBlank()) return ApiResponse.error("Title is required.");
                if (title.length() > 200) return ApiResponse.error("Title too long.");
                exam.setTitle(title.trim());
            }
            if (body.containsKey("subject")) exam.setSubject(((String) body.get("subject")).trim());
            if (body.containsKey("className")) exam.setClassName(((String) body.get("className")).trim());
            if (body.containsKey("section")) exam.setSection(((String) body.get("section")).trim());
            if (body.containsKey("instructions")) exam.setInstructions((String) body.get("instructions"));
        }

        return ApiResponse.success("Exam updated.", examRepository.save(exam));
    }

    @Transactional
    public ApiResponse<Void> deleteExam(Teacher teacher, Long examId) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty() || !teacher.getId().equals(opt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        OnlineExam exam = opt.get();
        if (exam.getStatus() != OnlineExam.Status.DRAFT) {
            long submissions = attemptRepository.countSubmittedByExamId(examId);
            if (submissions > 0) {
                return ApiResponse.error("Cannot delete exam with existing submissions.");
            }
        }
        // Cascade delete
        List<OnlineExamAttempt> attempts = attemptRepository.findByExamIdOrderBySubmittedAtDesc(examId);
        for (OnlineExamAttempt attempt : attempts) {
            answerRepository.deleteByAttemptId(attempt.getId());
        }
        attemptRepository.deleteByExamId(examId);
        questionRepository.deleteByExamId(examId);
        examRepository.delete(exam);
        return ApiResponse.success("Exam deleted.", null);
    }

    // ── Teacher: Questions ─────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<OnlineExamQuestion> addQuestion(Teacher teacher, Long examId, Map<String, Object> body) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty() || !teacher.getId().equals(opt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        String text = (String) body.get("questionText");
        if (text == null || text.isBlank()) return ApiResponse.error("Question text is required.");

        String typeStr = (String) body.getOrDefault("questionType", "WRITTEN");
        OnlineExamQuestion.QuestionType qType;
        try {
            qType = OnlineExamQuestion.QuestionType.valueOf(typeStr.toUpperCase());
        } catch (Exception e) {
            return ApiResponse.error("questionType must be MCQ or WRITTEN.");
        }

        int marks = 1;
        if (body.containsKey("marks")) {
            try {
                marks = Integer.parseInt(body.get("marks").toString());
                if (marks < 1) return ApiResponse.error("Marks must be at least 1.");
            } catch (NumberFormatException e) {
                return ApiResponse.error("Marks must be a number.");
            }
        }

        int orderIndex = questionRepository.countByExamId(examId);

        OnlineExamQuestion.OnlineExamQuestionBuilder builder = OnlineExamQuestion.builder()
                .examId(examId)
                .questionText(text.trim())
                .questionType(qType)
                .marks(marks)
                .orderIndex(orderIndex);

        if (qType == OnlineExamQuestion.QuestionType.MCQ) {
            String optA = (String) body.get("optionA");
            String optB = (String) body.get("optionB");
            String optC = (String) body.get("optionC");
            String optD = (String) body.get("optionD");
            String correct = (String) body.get("correctAnswer");

            if (optA == null || optA.isBlank() || optB == null || optB.isBlank()) {
                return ApiResponse.error("MCQ questions require at least options A and B.");
            }
            if (correct == null || !correct.toUpperCase().matches("[ABCD]")) {
                return ApiResponse.error("correctAnswer must be A, B, C, or D.");
            }
            builder.optionA(optA.trim())
                   .optionB(optB.trim())
                   .optionC(optC != null ? optC.trim() : null)
                   .optionD(optD != null ? optD.trim() : null)
                   .correctAnswer(correct.toUpperCase());
        }

        OnlineExamQuestion saved = questionRepository.save(builder.build());
        refreshTotalMarks(examId);
        return ApiResponse.success("Question added.", saved);
    }

    @Transactional
    public ApiResponse<OnlineExamQuestion> updateQuestion(Teacher teacher, Long examId, Long qId, Map<String, Object> body) {
        Optional<OnlineExam> examOpt = examRepository.findById(examId);
        if (examOpt.isEmpty() || !teacher.getId().equals(examOpt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        Optional<OnlineExamQuestion> qOpt = questionRepository.findById(qId);
        if (qOpt.isEmpty() || !qOpt.get().getExamId().equals(examId)) {
            return ApiResponse.error("Question not found.");
        }
        OnlineExamQuestion q = qOpt.get();

        if (body.containsKey("questionText")) {
            String text = (String) body.get("questionText");
            if (text == null || text.isBlank()) return ApiResponse.error("Question text is required.");
            q.setQuestionText(text.trim());
        }
        if (body.containsKey("questionType")) {
            try {
                q.setQuestionType(OnlineExamQuestion.QuestionType.valueOf(((String) body.get("questionType")).toUpperCase()));
            } catch (Exception e) {
                return ApiResponse.error("questionType must be MCQ or WRITTEN.");
            }
        }
        if (body.containsKey("marks")) {
            int m = Integer.parseInt(body.get("marks").toString());
            if (m < 1) return ApiResponse.error("Marks must be at least 1.");
            q.setMarks(m);
        }
        if (body.containsKey("optionA")) q.setOptionA((String) body.get("optionA"));
        if (body.containsKey("optionB")) q.setOptionB((String) body.get("optionB"));
        if (body.containsKey("optionC")) q.setOptionC((String) body.get("optionC"));
        if (body.containsKey("optionD")) q.setOptionD((String) body.get("optionD"));
        if (body.containsKey("correctAnswer")) {
            String correct = (String) body.get("correctAnswer");
            if (correct != null && !correct.toUpperCase().matches("[ABCD]")) {
                return ApiResponse.error("correctAnswer must be A, B, C, or D.");
            }
            q.setCorrectAnswer(correct != null ? correct.toUpperCase() : null);
        }
        if (body.containsKey("orderIndex")) {
            q.setOrderIndex(Integer.parseInt(body.get("orderIndex").toString()));
        }

        OnlineExamQuestion saved = questionRepository.save(q);
        refreshTotalMarks(examId);
        return ApiResponse.success("Question updated.", saved);
    }

    @Transactional
    public ApiResponse<Void> deleteQuestion(Teacher teacher, Long examId, Long qId) {
        Optional<OnlineExam> examOpt = examRepository.findById(examId);
        if (examOpt.isEmpty() || !teacher.getId().equals(examOpt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        Optional<OnlineExamQuestion> qOpt = questionRepository.findById(qId);
        if (qOpt.isEmpty() || !qOpt.get().getExamId().equals(examId)) {
            return ApiResponse.error("Question not found.");
        }
        questionRepository.delete(qOpt.get());
        refreshTotalMarks(examId);
        return ApiResponse.success("Question deleted.", null);
    }

    // ── Teacher: Publish / Close ───────────────────────────────────────────────

    @Transactional
    public ApiResponse<OnlineExam> publishExam(Teacher teacher, Long examId) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty() || !teacher.getId().equals(opt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        OnlineExam exam = opt.get();
        if (exam.getStatus() != OnlineExam.Status.DRAFT) {
            return ApiResponse.error("Only DRAFT exams can be published.");
        }
        int qCount = questionRepository.countByExamId(examId);
        if (qCount == 0) {
            return ApiResponse.error("Exam must have at least one question before publishing.");
        }
        exam.setStatus(OnlineExam.Status.PUBLISHED);
        return ApiResponse.success("Exam published.", examRepository.save(exam));
    }

    @Transactional
    public ApiResponse<OnlineExam> closeExam(Teacher teacher, Long examId) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty() || !teacher.getId().equals(opt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        OnlineExam exam = opt.get();
        if (exam.getStatus() == OnlineExam.Status.CLOSED) {
            return ApiResponse.error("Exam is already closed.");
        }
        exam.setStatus(OnlineExam.Status.CLOSED);
        return ApiResponse.success("Exam closed.", examRepository.save(exam));
    }

    // ── Teacher: Results & Grading ─────────────────────────────────────────────

    public ApiResponse<List<Map<String, Object>>> getExamResults(Teacher teacher, Long examId) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty() || !teacher.getId().equals(opt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        return ApiResponse.success(buildResultsList(examId, opt.get()));
    }

    @Transactional
    public ApiResponse<Map<String, Object>> gradeAttempt(Teacher teacher, Long examId, Long attemptId,
                                                          List<Map<String, Object>> grades) {
        Optional<OnlineExam> examOpt = examRepository.findById(examId);
        if (examOpt.isEmpty() || !teacher.getId().equals(examOpt.get().getTeacherId())) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        Optional<OnlineExamAttempt> attemptOpt = attemptRepository.findById(attemptId);
        if (attemptOpt.isEmpty() || !attemptOpt.get().getExamId().equals(examId)) {
            return ApiResponse.error("Attempt not found.");
        }
        OnlineExamAttempt attempt = attemptOpt.get();
        if (attempt.getStatus() == OnlineExamAttempt.AttemptStatus.IN_PROGRESS) {
            return ApiResponse.error("Cannot grade an in-progress attempt.");
        }

        List<OnlineExamQuestion> questions = questionRepository.findByExamIdOrderByOrderIndexAsc(examId);
        Map<Long, OnlineExamQuestion> questionMap = questions.stream()
                .collect(Collectors.toMap(OnlineExamQuestion::getId, q -> q));

        for (Map<String, Object> entry : grades) {
            Long questionId = Long.parseLong(entry.get("questionId").toString());
            Object marksObj = entry.get("marksAwarded");
            if (marksObj == null) continue;
            int marksAwarded = Integer.parseInt(marksObj.toString());

            OnlineExamQuestion q = questionMap.get(questionId);
            if (q == null || q.getQuestionType() != OnlineExamQuestion.QuestionType.WRITTEN) continue;

            if (marksAwarded < 0) marksAwarded = 0;
            if (marksAwarded > q.getMarks()) marksAwarded = q.getMarks();

            final int finalMarks = marksAwarded;
            answerRepository.findByAttemptIdAndQuestionId(attemptId, questionId).ifPresent(ans -> {
                ans.setMarksAwarded(finalMarks);
                answerRepository.save(ans);
            });
        }

        // Recompute total score
        Integer scoreRaw = answerRepository.sumMarksAwardedByAttemptId(attemptId);
        int totalScore = scoreRaw != null ? scoreRaw : 0;
        attempt.setTotalScore(totalScore);

        // Check if all written questions are graded → set isGraded + GRADED status
        List<OnlineExamAnswer> answers = answerRepository.findByAttemptId(attemptId);
        boolean allGraded = questions.stream()
                .filter(q -> q.getQuestionType() == OnlineExamQuestion.QuestionType.WRITTEN)
                .allMatch(q -> answers.stream()
                        .anyMatch(a -> a.getQuestionId().equals(q.getId()) && a.getMarksAwarded() != null));

        if (allGraded) {
            attempt.setIsGraded(true);
            attempt.setStatus(OnlineExamAttempt.AttemptStatus.GRADED);
        }
        attemptRepository.save(attempt);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("attemptId", attemptId);
        result.put("totalScore", totalScore);
        result.put("isGraded", attempt.getIsGraded());
        result.put("status", attempt.getStatus());
        return ApiResponse.success("Grades saved.", result);
    }

    // ── Student: Exams ─────────────────────────────────────────────────────────

    public ApiResponse<List<Map<String, Object>>> listStudentExams(Student student) {
        List<OnlineExam> exams = examRepository.findPublishedForClass(
                student.getSchoolId(), student.getClassName(), student.getSection());

        return ApiResponse.success(exams.stream().map(exam -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", exam.getId());
            row.put("title", exam.getTitle());
            row.put("subject", exam.getSubject());
            row.put("className", exam.getClassName());
            row.put("section", exam.getSection());
            row.put("teacherName", exam.getTeacherName());
            row.put("dueDateTime", exam.getDueDateTime());
            row.put("instructions", exam.getInstructions());
            row.put("status", exam.getStatus());
            row.put("totalMarks", exam.getTotalMarks());
            row.put("questionCount", questionRepository.countByExamId(exam.getId()));

            attemptRepository.findByExamIdAndStudentId(exam.getId(), student.getId()).ifPresentOrElse(
                    attempt -> {
                        row.put("attemptId", attempt.getId());
                        row.put("attemptStatus", attempt.getStatus());
                        row.put("totalScore", attempt.getTotalScore());
                        row.put("isGraded", attempt.getIsGraded());
                        row.put("submittedAt", attempt.getSubmittedAt());
                    },
                    () -> {
                        row.put("attemptId", null);
                        row.put("attemptStatus", null);
                        row.put("totalScore", null);
                        row.put("isGraded", false);
                        row.put("submittedAt", null);
                    }
            );
            return row;
        }).collect(Collectors.toList()));
    }

    public ApiResponse<Map<String, Object>> getStudentExam(Student student, Long examId) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty()) return ApiResponse.error("Exam not found.");
        OnlineExam exam = opt.get();
        if (!student.getSchoolId().equals(exam.getSchoolId())) {
            return ApiResponse.error("Access denied.");
        }
        if (exam.getStatus() != OnlineExam.Status.PUBLISHED && exam.getStatus() != OnlineExam.Status.CLOSED) {
            return ApiResponse.error("Exam is not available.");
        }
        return ApiResponse.success(enrichExamWithQuestions(exam, false));
    }

    @Transactional
    public ApiResponse<OnlineExamAttempt> startExam(Student student, Long examId) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty() || !student.getSchoolId().equals(opt.get().getSchoolId())) {
            return ApiResponse.error("Exam not found.");
        }
        OnlineExam exam = opt.get();
        if (exam.getStatus() == OnlineExam.Status.DRAFT) {
            return ApiResponse.error("Exam is not published yet.");
        }
        if (exam.getStatus() == OnlineExam.Status.CLOSED) {
            return ApiResponse.error("This exam is closed.");
        }
        if (exam.getDueDateTime() != null && LocalDateTime.now().isAfter(exam.getDueDateTime())) {
            return ApiResponse.error("The due date for this exam has passed.");
        }

        Optional<OnlineExamAttempt> existing = attemptRepository.findByExamIdAndStudentId(examId, student.getId());
        if (existing.isPresent()) {
            return ApiResponse.success("Resuming existing attempt.", existing.get());
        }

        OnlineExamAttempt attempt = OnlineExamAttempt.builder()
                .examId(examId)
                .studentId(student.getId())
                .studentName(student.getName())
                .className(student.getClassName())
                .section(student.getSection())
                .schoolId(student.getSchoolId())
                .status(OnlineExamAttempt.AttemptStatus.IN_PROGRESS)
                .startedAt(LocalDateTime.now())
                .isGraded(false)
                .build();

        return ApiResponse.success("Exam started.", attemptRepository.save(attempt));
    }

    @Transactional
    public ApiResponse<Void> saveAnswers(Student student, Long examId, List<Map<String, Object>> answers) {
        Optional<OnlineExamAttempt> attemptOpt = attemptRepository.findByExamIdAndStudentId(examId, student.getId());
        if (attemptOpt.isEmpty()) return ApiResponse.error("No active attempt found. Start the exam first.");

        OnlineExamAttempt attempt = attemptOpt.get();
        if (attempt.getStatus() == OnlineExamAttempt.AttemptStatus.SUBMITTED ||
            attempt.getStatus() == OnlineExamAttempt.AttemptStatus.GRADED) {
            return ApiResponse.error("Exam has already been submitted.");
        }

        Optional<OnlineExam> examOpt = examRepository.findById(examId);
        if (examOpt.isEmpty()) return ApiResponse.error("Exam not found.");
        OnlineExam exam = examOpt.get();

        if (exam.getDueDateTime() != null && LocalDateTime.now().isAfter(exam.getDueDateTime())) {
            return ApiResponse.error("The due date for this exam has passed. Answers cannot be saved.");
        }

        for (Map<String, Object> entry : answers) {
            Long questionId = Long.parseLong(entry.get("questionId").toString());
            String studentAnswer = (String) entry.get("studentAnswer");

            Optional<OnlineExamAnswer> existing = answerRepository.findByAttemptIdAndQuestionId(attempt.getId(), questionId);
            if (existing.isPresent()) {
                existing.get().setStudentAnswer(studentAnswer);
                answerRepository.save(existing.get());
            } else {
                answerRepository.save(OnlineExamAnswer.builder()
                        .attemptId(attempt.getId())
                        .questionId(questionId)
                        .examId(examId)
                        .studentAnswer(studentAnswer)
                        .build());
            }
        }
        return ApiResponse.success("Answers saved.", null);
    }

    @Transactional
    public ApiResponse<OnlineExamAttempt> submitExam(Student student, Long examId) {
        Optional<OnlineExamAttempt> attemptOpt = attemptRepository.findByExamIdAndStudentId(examId, student.getId());
        if (attemptOpt.isEmpty()) return ApiResponse.error("No active attempt found.");

        OnlineExamAttempt attempt = attemptOpt.get();
        if (attempt.getStatus() != OnlineExamAttempt.AttemptStatus.IN_PROGRESS) {
            return ApiResponse.error("Exam has already been submitted.");
        }

        Optional<OnlineExam> examOpt = examRepository.findById(examId);
        if (examOpt.isEmpty()) return ApiResponse.error("Exam not found.");
        OnlineExam exam = examOpt.get();

        if (exam.getDueDateTime() != null && LocalDateTime.now().isAfter(exam.getDueDateTime())) {
            return ApiResponse.error("The due date for this exam has passed.");
        }

        List<OnlineExamQuestion> questions = questionRepository.findByExamIdOrderByOrderIndexAsc(examId);

        // Auto-grade MCQ answers
        for (OnlineExamQuestion q : questions) {
            if (q.getQuestionType() == OnlineExamQuestion.QuestionType.MCQ) {
                Optional<OnlineExamAnswer> ansOpt = answerRepository.findByAttemptIdAndQuestionId(attempt.getId(), q.getId());
                if (ansOpt.isPresent()) {
                    OnlineExamAnswer ans = ansOpt.get();
                    String studentAns = ans.getStudentAnswer();
                    boolean correct = q.getCorrectAnswer() != null && q.getCorrectAnswer().equalsIgnoreCase(studentAns);
                    ans.setIsCorrect(correct);
                    ans.setMarksAwarded(correct ? q.getMarks() : 0);
                    answerRepository.save(ans);
                } else {
                    // Student did not answer this MCQ — create answer record with 0 marks
                    answerRepository.save(OnlineExamAnswer.builder()
                            .attemptId(attempt.getId())
                            .questionId(q.getId())
                            .examId(examId)
                            .studentAnswer(null)
                            .isCorrect(false)
                            .marksAwarded(0)
                            .build());
                }
            }
        }

        // Compute total score (WRITTEN marks are null at this point — count as 0)
        Integer scoreRaw2 = answerRepository.sumMarksAwardedByAttemptId(attempt.getId());
        int totalScore = scoreRaw2 != null ? scoreRaw2 : 0;

        // Check if there are any WRITTEN questions — if not, mark as fully graded
        boolean hasWritten = questions.stream()
                .anyMatch(q -> q.getQuestionType() == OnlineExamQuestion.QuestionType.WRITTEN);

        attempt.setStatus(OnlineExamAttempt.AttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setTotalScore(totalScore);
        if (!hasWritten) {
            attempt.setIsGraded(true);
            attempt.setStatus(OnlineExamAttempt.AttemptStatus.GRADED);
        }

        return ApiResponse.success("Exam submitted successfully.", attemptRepository.save(attempt));
    }

    public ApiResponse<Map<String, Object>> getStudentResult(Student student, Long examId) {
        Optional<OnlineExamAttempt> attemptOpt = attemptRepository.findByExamIdAndStudentId(examId, student.getId());
        if (attemptOpt.isEmpty()) return ApiResponse.error("No attempt found.");

        OnlineExamAttempt attempt = attemptOpt.get();
        if (attempt.getStatus() == OnlineExamAttempt.AttemptStatus.IN_PROGRESS) {
            return ApiResponse.error("Exam has not been submitted yet.");
        }

        Optional<OnlineExam> examOpt = examRepository.findById(examId);
        if (examOpt.isEmpty()) return ApiResponse.error("Exam not found.");

        Map<String, Object> result = buildAttemptDetail(attempt, examOpt.get(), false);
        return ApiResponse.success(result);
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    public ApiResponse<List<Map<String, Object>>> listAdminExams(Long schoolId) {
        List<OnlineExam> exams = examRepository.findPublishedAndClosedBySchool(schoolId);
        return ApiResponse.success(exams.stream()
                .map(e -> enrichExam(e, true))
                .collect(Collectors.toList()));
    }

    public ApiResponse<List<Map<String, Object>>> getAdminExamResults(Long schoolId, Long examId) {
        Optional<OnlineExam> opt = examRepository.findById(examId);
        if (opt.isEmpty() || !opt.get().getSchoolId().equals(schoolId)) {
            return ApiResponse.error("Exam not found or access denied.");
        }
        return ApiResponse.success(buildResultsList(examId, opt.get()));
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private Map<String, Object> enrichExam(OnlineExam exam, boolean includeTeacherDetails) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", exam.getId());
        map.put("title", exam.getTitle());
        map.put("subject", exam.getSubject());
        map.put("className", exam.getClassName());
        map.put("section", exam.getSection());
        map.put("schoolId", exam.getSchoolId());
        map.put("teacherId", exam.getTeacherId());
        map.put("teacherName", exam.getTeacherName());
        map.put("dueDateTime", exam.getDueDateTime());
        map.put("instructions", exam.getInstructions());
        map.put("status", exam.getStatus());
        map.put("totalMarks", exam.getTotalMarks());
        map.put("questionCount", questionRepository.countByExamId(exam.getId()));
        map.put("createdAt", exam.getCreatedAt());
        map.put("updatedAt", exam.getUpdatedAt());
        return map;
    }

    private Map<String, Object> enrichExamWithQuestions(OnlineExam exam, boolean includeCorrectAnswers) {
        Map<String, Object> map = enrichExam(exam, true);
        List<OnlineExamQuestion> questions = questionRepository.findByExamIdOrderByOrderIndexAsc(exam.getId());
        List<Map<String, Object>> qList = questions.stream().map(q -> {
            Map<String, Object> qMap = new LinkedHashMap<>();
            qMap.put("id", q.getId());
            qMap.put("examId", q.getExamId());
            qMap.put("questionText", q.getQuestionText());
            qMap.put("questionType", q.getQuestionType());
            qMap.put("optionA", q.getOptionA());
            qMap.put("optionB", q.getOptionB());
            qMap.put("optionC", q.getOptionC());
            qMap.put("optionD", q.getOptionD());
            qMap.put("marks", q.getMarks());
            qMap.put("orderIndex", q.getOrderIndex());
            if (includeCorrectAnswers) {
                qMap.put("correctAnswer", q.getCorrectAnswer());
            }
            return qMap;
        }).collect(Collectors.toList());
        map.put("questions", qList);
        return map;
    }

    private List<Map<String, Object>> buildResultsList(Long examId, OnlineExam exam) {
        List<OnlineExamAttempt> attempts = attemptRepository.findByExamIdOrderBySubmittedAtDesc(examId);
        return attempts.stream()
                .map(a -> buildAttemptDetail(a, exam, true))
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildAttemptDetail(OnlineExamAttempt attempt, OnlineExam exam, boolean forTeacher) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("attemptId", attempt.getId());
        map.put("examId", attempt.getExamId());
        map.put("examTitle", exam.getTitle());
        map.put("studentId", attempt.getStudentId());
        map.put("studentName", attempt.getStudentName());
        map.put("className", attempt.getClassName());
        map.put("section", attempt.getSection());
        map.put("status", attempt.getStatus());
        map.put("startedAt", attempt.getStartedAt());
        map.put("submittedAt", attempt.getSubmittedAt());
        map.put("totalScore", attempt.getTotalScore());
        map.put("totalMarks", exam.getTotalMarks());
        map.put("isGraded", attempt.getIsGraded());

        List<OnlineExamQuestion> questions = questionRepository.findByExamIdOrderByOrderIndexAsc(exam.getId());
        List<OnlineExamAnswer> answers = answerRepository.findByAttemptId(attempt.getId());
        Map<Long, OnlineExamAnswer> answerMap = answers.stream()
                .collect(Collectors.toMap(OnlineExamAnswer::getQuestionId, a -> a, (a, b) -> a));

        List<Map<String, Object>> qResults = questions.stream().map(q -> {
            Map<String, Object> qr = new LinkedHashMap<>();
            qr.put("questionId", q.getId());
            qr.put("questionText", q.getQuestionText());
            qr.put("questionType", q.getQuestionType());
            qr.put("marks", q.getMarks());
            qr.put("orderIndex", q.getOrderIndex());
            if (q.getQuestionType() == OnlineExamQuestion.QuestionType.MCQ) {
                qr.put("optionA", q.getOptionA());
                qr.put("optionB", q.getOptionB());
                qr.put("optionC", q.getOptionC());
                qr.put("optionD", q.getOptionD());
                if (forTeacher) qr.put("correctAnswer", q.getCorrectAnswer());
            }
            OnlineExamAnswer ans = answerMap.get(q.getId());
            if (ans != null) {
                qr.put("studentAnswer", ans.getStudentAnswer());
                qr.put("marksAwarded", ans.getMarksAwarded());
                qr.put("isCorrect", ans.getIsCorrect());
            } else {
                qr.put("studentAnswer", null);
                qr.put("marksAwarded", null);
                qr.put("isCorrect", null);
            }
            return qr;
        }).collect(Collectors.toList());

        map.put("answers", qResults);
        return map;
    }
}
