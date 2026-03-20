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

		// Use relative path with file: prefix for portability across Windows and Linux
		registry.addResourceHandler("/uploads/**")
				.addResourceLocations("file:uploads/")
				.setCachePeriod(3600);
	}
}
