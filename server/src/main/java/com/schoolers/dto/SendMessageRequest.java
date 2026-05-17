package com.schoolers.dto;

public class SendMessageRequest {
    private String message;
    private String lang = "en";

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getLang() { return lang; }
    public void setLang(String lang) { this.lang = lang; }
}
