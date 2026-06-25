package com.schoolers.repository;

import com.schoolers.model.MessageRead;
import com.schoolers.model.MessageReadId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessageReadRepository extends JpaRepository<MessageRead, MessageReadId> {
    boolean existsByMessageIdAndUserId(Long messageId, Long userId);
    List<MessageRead> findByMessageId(Long messageId);
    long countByMessageId(Long messageId);
}
