package com.example.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DataController {

    @GetMapping("/api/data")
    public DataResponse getData() {
        return new DataResponse("Hallo von Render-Backend!");
    }

    private static class DataResponse {
        private String message;

        public DataResponse(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }
    }
}