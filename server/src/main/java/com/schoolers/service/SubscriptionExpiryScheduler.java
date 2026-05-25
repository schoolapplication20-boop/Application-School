package com.schoolers.service;

import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.logging.Logger;

/**
 * Runs daily at 9 AM and sends in-app notifications to APPLICATION_OWNER and
 * the school's SUPER_ADMIN when a subscription is exactly 5 days from expiry.
 */
@Component
public class SubscriptionExpiryScheduler {

    private static final Logger log = Logger.getLogger(SubscriptionExpiryScheduler.class.getName());

    @Autowired private SchoolRepository schoolRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AppNotificationService notificationService;

    @Scheduled(cron = "0 0 9 * * *")
    public void checkExpiringSubscriptions() {
        LocalDate target = LocalDate.now().plusDays(5);
        List<School> expiring = schoolRepository.findBySubscriptionExpiry(target);

        if (expiring.isEmpty()) return;

        List<User> owners = userRepository.findByRole(User.Role.APPLICATION_OWNER);

        for (School school : expiring) {
            String plan = school.getSubscriptionPlan() != null ? school.getSubscriptionPlan() : "subscription";
            String msg = "⚠️ " + school.getName() + " — " + plan + " plan expires in 5 days (" + target + "). Please renew to avoid service interruption.";

            // Notify all APPLICATION_OWNERs
            for (User owner : owners) {
                notificationService.create(owner.getId(), msg, "warning", "#dd6b20", "subscription_expiry", school.getId());
            }

            // Notify the school's SUPER_ADMIN
            List<User> superAdmins = userRepository.findByRoleAndSchoolId(User.Role.SUPER_ADMIN, school.getId());
            for (User sa : superAdmins) {
                notificationService.create(sa.getId(),
                    "⚠️ Your school's " + plan + " plan expires in 5 days (" + target + "). Contact the platform team to renew.",
                    "warning", "#dd6b20", "subscription_expiry", school.getId());
            }

            log.info("[SubscriptionExpiry] Notified for school: " + school.getName() + " (expiry: " + target + ")");
        }
    }
}
