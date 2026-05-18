package com.schoolers.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.model.PushSubscription;
import com.schoolers.repository.PushSubscriptionRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.security.Security;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

@Service
public class PushNotificationService {

    private static final Logger log = Logger.getLogger(PushNotificationService.class.getName());

    @Value("${vapid.public.key}")
    private String vapidPublicKey;

    @Value("${vapid.private.key}")
    private String vapidPrivateKey;

    @Value("${vapid.subject:mailto:admin@my-skoolz.com}")
    private String vapidSubject;

    @Autowired
    private PushSubscriptionRepository pushSubscriptionRepository;

    private PushService pushService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
        } catch (Exception e) {
            log.severe("[PushNotificationService] Failed to initialize PushService: " + e.getMessage());
        }
    }

    public void saveSubscription(Long userId, String endpoint, String p256dh, String auth) {
        // Remove old subscription for same endpoint if exists
        pushSubscriptionRepository.deleteByUserIdAndEndpoint(userId, endpoint);
        PushSubscription sub = PushSubscription.builder()
                .userId(userId)
                .endpoint(endpoint)
                .p256dh(p256dh)
                .auth(auth)
                .build();
        pushSubscriptionRepository.save(sub);
    }

    public void sendToUser(Long userId, String title, String body, String url) {
        if (pushService == null) return;
        List<PushSubscription> subs = pushSubscriptionRepository.findByUserId(userId);
        for (PushSubscription sub : subs) {
            try {
                Map<String, String> payload = Map.of(
                        "title", title,
                        "body", body,
                        "url", url != null ? url : "/messages"
                );
                String json = objectMapper.writeValueAsString(payload);
                Subscription subscription = new Subscription(
                        sub.getEndpoint(),
                        new Subscription.Keys(sub.getP256dh(), sub.getAuth())
                );
                Notification notification = new Notification(subscription, json);
                pushService.send(notification);
            } catch (Exception e) {
                log.warning("[PushNotificationService] Failed to send to userId=" + userId + ": " + e.getMessage());
                // Remove stale subscriptions (device unregistered)
                if (e.getMessage() != null && (e.getMessage().contains("410") || e.getMessage().contains("404"))) {
                    pushSubscriptionRepository.deleteByUserIdAndEndpoint(userId, sub.getEndpoint());
                }
            }
        }
    }
}
