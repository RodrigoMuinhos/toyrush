package br.com.toyfactory.payments;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Configuration
public class ApiSecurity implements WebMvcConfigurer {
  private final PaymentConfig config;
  public ApiSecurity(PaymentConfig config) {this.config=config;}
  @Override public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(new HandlerInterceptor() {
      @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler) throws Exception {
        String key=request.getHeader("X-Machine-Key");
        if(config.machineKey()==null||config.machineKey().length()<32||key==null||!MessageDigest.isEqual(config.machineKey().getBytes(StandardCharsets.UTF_8),key.getBytes(StandardCharsets.UTF_8))) {
          response.setStatus(401);response.setContentType("application/json");response.getWriter().write("{\"message\":\"Máquina não autenticada\"}");return false;
        }
        response.setHeader("Cache-Control","no-store");return true;
      }
    }).addPathPatterns("/api/**").excludePathPatterns("/api/webhooks/mercadopago");
  }
}
