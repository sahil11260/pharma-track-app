import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class CleanupMojibake {
    public static void main(String[] args) throws IOException {
        Path staticDir = Paths.get("src/main/resources/static");
        Map<String, String> replacements = new LinkedHashMap<>();
        replacements.put(
                "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ",
                "");
        replacements.put("ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦", "");
        replacements.put("ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ", "");
        replacements.put(
                "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â¼",
                "");
        replacements.put(
                "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â ",
                "");
        replacements.put("ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Ãƒâ€šÃ‚Â ", "");
        replacements.put("ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹", "");
        replacements.put("ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§Ãƒâ€šÃ‚Â¾", "");
        replacements.put(
                "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â¼",
                "");
        replacements.put("ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹", "₹");
        replacements.put("â‚¹", "₹");
        replacements.put("â€”", "—");
        replacements.put("Ã¢â‚¬â€", "—");

        Files.walk(staticDir)
                .filter(path -> Files.isRegularFile(path))
                .filter(path -> {
                    String name = path.toString();
                    return name.endsWith(".html") || name.endsWith(".js") || name.endsWith(".css");
                })
                .forEach(path -> {
                    try {
                        String content = new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
                        boolean modified = false;
                        for (Map.Entry<String, String> entry : replacements.entrySet()) {
                            if (content.contains(entry.getKey())) {
                                content = content.replace(entry.getKey(), entry.getValue());
                                modified = true;
                            }
                        }
                        if (modified) {
                            Files.write(path, content.getBytes(StandardCharsets.UTF_8));
                            System.out.println("Cleaned: " + path);
                        }
                    } catch (IOException e) {
                        System.err.println("Error processing " + path + ": " + e.getMessage());
                    }
                });
    }
}
