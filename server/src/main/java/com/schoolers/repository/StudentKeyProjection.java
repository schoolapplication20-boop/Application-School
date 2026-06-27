package com.schoolers.repository;

/** Lightweight projection used by BulkImportJobProcessor for duplicate-detection set building.
 *  Only fetches the four key fields instead of the full Student entity. */
public interface StudentKeyProjection {
    String getAdmissionNumber();
    String getRollNumber();
    String getClassName();
    String getSection();
}
