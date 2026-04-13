package com.schoolers.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    /**
     * Stores a logo file under uploads/logos/ and returns the public URL path.
     * The filename is randomised to avoid collisions.
     */
    public String storeLogo(MultipartFile file) throws IOException {
        validateImageFile(file);

        Path logoDir = Paths.get(uploadDir, "logos").toAbsolutePath().normalize();
        Files.createDirectories(logoDir);

        String extension   = getExtension(file.getOriginalFilename());
        String newFilename = "logo_" + UUID.randomUUID() + "." + extension;

        Path targetPath = logoDir.resolve(newFilename);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        // Return the URL path the frontend will use to fetch the image
        return "/uploads/logos/" + newFilename;
    }

    /**
     * Deletes the file at the given URL path (if it lives inside the upload dir).
     * Silently ignores missing files.
     */
    public void deleteLogo(String logoUrl) {
        if (logoUrl == null || logoUrl.isBlank()) return;
        try {
            // logoUrl looks like "/uploads/logos/logo_xxx.jpg"
            String relativePath = logoUrl.replaceFirst("^/", "");
            Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize()
                    .resolve(relativePath.replace("uploads/", "")).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
            // best-effort deletion
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Logo file is empty.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are accepted for the logo.");
        }
        if (file.getSize() > 5 * 1024 * 1024) { // 5 MB
            throw new IllegalArgumentException("Logo file must be smaller than 5 MB.");
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "png";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
