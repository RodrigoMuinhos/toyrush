package br.com.toyfactory.payments;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Configuration
public class ApiSecurity implements WebMvcConfigurer {
  private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(ApiSecurity.class);
  private final PaymentConfig config;
  public ApiSecurity(PaymentConfig config) {this.config=config;}
  @Override public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
      .allowedOrigins("https://www.toyfactory.dev.br", "https://toyfactory.dev.br")
      .allowedMethods("GET", "POST", "OPTIONS")
      .allowedHeaders("Content-Type", "X-Machine-Key").maxAge(3600);
  }
  @Override public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(new HandlerInterceptor() {
      @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler) throws Exception {
        if(org.springframework.web.cors.CorsUtils.isPreFlightRequest(request)) return true;
        response.setHeader("Cache-Control","no-store");
        String key=request.getHeader("X-Machine-Key");
        if(config.machineKey()==null||config.machineKey().length()<32||key==null||!MessageDigest.isEqual(config.machineKey().getBytes(StandardCharsets.UTF_8),key.getBytes(StandardCharsets.UTF_8))) {
          log.warn("machine_auth rejected method={}",request.getMethod());
          response.setStatus(401);response.setCharacterEncoding("UTF-8");response.setContentType("application/json");response.getWriter().write("{\"message\":\"Máquina não autenticada\"}");return false;
        }
        log.debug("machine_auth accepted machineId={}",config.machineId());return true;
      }
    }).addPathPatterns("/api/**").excludePathPatterns("/api/webhooks/mercadopago");
  }
}
