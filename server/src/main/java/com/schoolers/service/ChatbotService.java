package com.schoolers.service;

import com.schoolers.model.ChatbotFaq;
import com.schoolers.repository.ChatbotFaqRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ChatbotService {

    @Autowired
    private ChatbotFaqRepository chatbotFaqRepository;

    private static final Map<String, String> FALLBACK = Map.of(
        "en", "Sorry, I couldn't understand that. Please choose from the available options or type 'help'.",
        "hi", "क्षमा करें, मैं समझ नहीं पाया। कृपया उपलब्ध विकल्पों में से चुनें या 'help' टाइप करें।",
        "te", "క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి అందుబాటులో ఉన్న ఎంపికల నుండి ఎంచుకోండి లేదా 'help' టైప్ చేయండి."
    );

    public String getAnswer(String message, String lang) {
        if (message == null || message.isBlank()) {
            return "Please type a question or choose from the options above.";
        }

        String input = message.toLowerCase().trim();
        String resolvedLang = (lang == null || lang.isBlank()) ? "en" : lang.toLowerCase();
        List<ChatbotFaq> faqs = chatbotFaqRepository.findAll();

        // Pass 1: question match (longest wins)
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
        if (bestMatch != null) return localized(bestMatch, resolvedLang);

        // Pass 2: keyword match (longest keyword wins)
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
        if (kwMatch != null) return localized(kwMatch, resolvedLang);

        return FALLBACK.getOrDefault(resolvedLang, FALLBACK.get("en"));
    }

    private String localized(ChatbotFaq faq, String lang) {
        return switch (lang) {
            case "hi" -> (faq.getAnswerHi() != null && !faq.getAnswerHi().isBlank())
                         ? faq.getAnswerHi() : faq.getAnswer();
            case "te" -> (faq.getAnswerTe() != null && !faq.getAnswerTe().isBlank())
                         ? faq.getAnswerTe() : faq.getAnswer();
            default   -> faq.getAnswer();
        };
    }
}
