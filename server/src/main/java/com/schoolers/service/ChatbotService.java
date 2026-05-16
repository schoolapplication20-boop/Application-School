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
        if (message == null || message.isBlank()) {
            return "Please type a question or choose from the options above.";
        }

        String input = message.toLowerCase().trim();
        List<ChatbotFaq> faqs = chatbotFaqRepository.findAll();

        // Pass 1: question contains input OR input contains question (longest match first)
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

        // Pass 2: keyword match — pick the FAQ whose longest keyword matches
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
        if (kwMatch != null) return kwMatch.getAnswer();

        return FALLBACK;
    }
}
