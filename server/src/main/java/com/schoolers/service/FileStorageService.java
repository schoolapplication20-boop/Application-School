package com.schoolers.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
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
            // Strip leading slash and resolve against the upload root, then confirm the
            // resolved path stays within the upload directory to prevent path traversal.
            String relativePath = logoUrl.replaceFirst("^/", "");
            Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath   = uploadRoot.resolve(relativePath).normalize();
            if (!filePath.startsWith(uploadRoot)) return; // traversal attempt — silently ignore
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
            // best-effort deletion
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("jpg", "jpeg", "png", "gif", "webp");

    private void validateImageFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Logo file is empty.");

        // Extension whitelist — do not rely solely on Content-Type (user-controlled)
        String ext = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext))
            throw new IllegalArgumentException("Unsupported file type. Allowed: jpg, jpeg, png, gif, webp.");

        if (file.getSize() > 5 * 1024 * 1024)
            throw new IllegalArgumentException("Logo file must be smaller than 5 MB.");

        // Magic bytes validation — read the first 4 bytes to confirm the actual format
        try (InputStream is = file.getInputStream()) {
            byte[] header = is.readNBytes(4);
            if (!isAllowedImageHeader(header))
                throw new IllegalArgumentException("File content does not match a supported image format.");
        }
    }

    private boolean isAllowedImageHeader(byte[] h) {
        if (h.length < 3) return false;
        // JPEG: FF D8 FF
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return true;
        // PNG: 89 50 4E 47
        if (h.length >= 4 && (h[0] & 0xFF) == 0x89 && (h[1] & 0xFF) == 0x50
                && (h[2] & 0xFF) == 0x4E && (h[3] & 0xFF) == 0x47) return true;
        // GIF: 47 49 46
        if ((h[0] & 0xFF) == 0x47 && (h[1] & 0xFF) == 0x49 && (h[2] & 0xFF) == 0x46) return true;
        // WebP: 52 49 46 46 (RIFF) — first 4 bytes
        if (h.length >= 4 && (h[0] & 0xFF) == 0x52 && (h[1] & 0xFF) == 0x49
                && (h[2] & 0xFF) == 0x46 && (h[3] & 0xFF) == 0x46) return true;
        return false;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "bin";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
