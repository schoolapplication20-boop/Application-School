package com.schoolers.model;

import java.io.Serializable;
import lombok.Data;

@Data
public class MessageReadId implements Serializable {
    private Long messageId;
    private Long userId;
}
