package com.schoolers.service;

import com.schoolers.model.ChatbotFaq;
import com.schoolers.repository.ChatbotFaqRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatbotService {

    @Autowired
    private ChatbotFaqRepository chatbotFaqRepository;

    private static final String FALLBACK =
        "Sorry, I couldn't understand that. Please choose from the available options or type 'help' to see what I can assist with.";

    public String getAnswer(String message) {
        String match = getAnswerOrNull(message);
        if (match != null) return match;
        if (message == null || message.isBlank()) return "Please type a question or choose from the options above.";
        return FALLBACK;
    }

    // Returns null when no FAQ matches (signals Gemini escalation is possible)
    public String getAnswerOrNull(String message) {
        if (message == null || message.isBlank()) return null;

        String input = message.toLowerCase().trim();
        List<ChatbotFaq> faqs = chatbotFaqRepository.findAll();

        ChatbotFaq bestMatch = null;
        int bestLen = 0;
        for (ChatbotFaq faq : faqs) {
            String question = faq.getQuestion().toLowerCase();
            if (input.contains(question) || question.contains(input)) {
                if (question.length() > bestLen) {
                    bestLen = question.length();
                    bestMatch = faq;
                }
            }
        }
        if (bestMatch != null) return bestMatch.getAnswer();

        ChatbotFaq kwMatch = null;
        int kwLen = 0;
        for (ChatbotFaq faq : faqs) {
            if (faq.getKeywords() == null) continue;
            for (String kw : faq.getKeywords().toLowerCase().split(",")) {
                String keyword = kw.trim();
                if (!keyword.isEmpty() && input.contains(keyword) && keyword.length() > kwLen) {
                    kwLen = keyword.length();
                    kwMatch = faq;
                }
            }
        }
        return kwMatch != null ? kwMatch.getAnswer() : null;
    }
}
