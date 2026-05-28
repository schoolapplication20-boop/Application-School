package com.schoolers.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private Cloudinary cloudinary;
    private boolean useCloudinary;

    @PostConstruct
    void init() {
        useCloudinary = cloudinaryUrl != null && !cloudinaryUrl.isBlank();
        if (useCloudinary) {
            cloudinary = new Cloudinary(cloudinaryUrl);
            cloudinary.config.secure = true;
        }
    }

    public String storeLogo(MultipartFile file) throws IOException {
        validateImageFile(file);
        return useCloudinary ? uploadToCloudinary(file) : saveToLocalDisk(file);
    }

    public void deleteLogo(String logoUrl) {
        if (logoUrl == null || logoUrl.isBlank()) return;
        if (useCloudinary && logoUrl.startsWith("http")) {
            deleteFromCloudinary(logoUrl);
        } else {
            deleteFromLocalDisk(logoUrl);
        }
    }

    // ── Cloudinary ────────────────────────────────────────────────────────────

    private String uploadToCloudinary(MultipartFile file) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder",          "schoolers/logos",
                        "resource_type",   "image",
                        "allowed_formats", "jpg,jpeg,png,gif,webp",
                        "overwrite",       false
                )
        );
        return (String) result.get("secure_url");
    }

    private void deleteFromCloudinary(String secureUrl) {
        try {
            // Extract public_id from URL:
            // https://res.cloudinary.com/<cloud>/image/upload/v123/schoolers/logos/<name>.jpg
            // → schoolers/logos/<name>
            String[] parts = secureUrl.split("/upload/");
            if (parts.length < 2) return;
            String withVersion = parts[1]; // v123/schoolers/logos/name.jpg
            String noVersion   = withVersion.replaceFirst("^v\\d+/", "");
            String publicId    = noVersion.contains(".")
                    ? noVersion.substring(0, noVersion.lastIndexOf('.'))
                    : noVersion;
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception ignored) {
            // best-effort
        }
    }

    // ── Local disk (dev fallback) ─────────────────────────────────────────────

    private String saveToLocalDisk(MultipartFile file) throws IOException {
        Path logoDir = Paths.get(uploadDir, "logos").toAbsolutePath().normalize();
        Files.createDirectories(logoDir);

        String extension   = getExtension(file.getOriginalFilename());
        String newFilename = "logo_" + UUID.randomUUID() + "." + extension;
        Path targetPath    = logoDir.resolve(newFilename);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/logos/" + newFilename;
    }

    private void deleteFromLocalDisk(String logoUrl) {
        try {
            String relativePath = logoUrl.replaceFirst("^/", "");
            Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath   = uploadRoot.resolve(relativePath).normalize();
            if (!filePath.startsWith(uploadRoot)) return;
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
            // best-effort
        }
    }

    // ── Validation ────────────────────────────────────────────────────────────

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("jpg", "jpeg", "png", "gif", "webp");

    private void validateImageFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Logo file is empty.");

        String ext = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext))
            throw new IllegalArgumentException("Unsupported file type. Allowed: jpg, jpeg, png, gif, webp.");

        if (file.getSize() > 5 * 1024 * 1024)
            throw new IllegalArgumentException("Logo file must be smaller than 5 MB.");

        try (InputStream is = file.getInputStream()) {
            byte[] header = is.readNBytes(4);
            if (!isAllowedImageHeader(header))
                throw new IllegalArgumentException("File content does not match a supported image format.");
        }
    }

    private boolean isAllowedImageHeader(byte[] h) {
        if (h.length < 3) return false;
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return true; // JPEG
        if (h.length >= 4 && (h[0] & 0xFF) == 0x89 && (h[1] & 0xFF) == 0x50
                && (h[2] & 0xFF) == 0x4E && (h[3] & 0xFF) == 0x47) return true; // PNG
        if ((h[0] & 0xFF) == 0x47 && (h[1] & 0xFF) == 0x49 && (h[2] & 0xFF) == 0x46) return true; // GIF
        if (h.length >= 4 && (h[0] & 0xFF) == 0x52 && (h[1] & 0xFF) == 0x49
                && (h[2] & 0xFF) == 0x46 && (h[3] & 0xFF) == 0x46) return true; // WebP
        return false;
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "bin";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
