package com.schoolers.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Data;
import java.io.Serializable;

@Embeddable
@Data
public class SchoolFeatureId implements Serializable {

    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "feature_key")
    private String featureKey;
}
