package com.schoolers.config;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.BigQueryOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BigQueryConfig {

    @Value("${gcp.project.id}")
    private String projectId;

    /**
     * Creates the BigQuery client using Application Default Credentials (ADC).
     *
     * Local dev: set GOOGLE_APPLICATION_CREDENTIALS env var to your service account JSON path.
     * Cloud Run / GKE: ADC is picked up automatically from the attached service account.
     */
    @Bean
    public BigQuery bigQuery() {
        return BigQueryOptions.newBuilder()
                .setProjectId(projectId)
                .build()
                .getService();
    }
}
