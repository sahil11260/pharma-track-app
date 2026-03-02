package com.kavyapharm.farmatrack.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

        @Override
        public void addCorsMappings(@org.springframework.lang.NonNull CorsRegistry registry) {
                registry.addMapping("/**")
                                .allowedOrigins("*")
                                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                                .allowedHeaders("*");
        }

        @Override
        public void addResourceHandlers(
                        @org.springframework.lang.NonNull org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {

                String uploadPath = new java.io.File("uploads").getAbsolutePath().replace("\\", "/");
                if (!uploadPath.endsWith("/")) {
                        uploadPath += "/";
                }

                // Use file:/// for Windows compatibility with absolute paths
                registry.addResourceHandler("/uploads/**")
                                .addResourceLocations("file:///" + uploadPath)
                                .setCachePeriod(3600);

                // Specifically for receipts if needed, though the above covers it
                registry.addResourceHandler("/uploads/receipts/**")
                                .addResourceLocations("file:///" + uploadPath + "receipts/")
                                .setCachePeriod(3600);
        }
}
