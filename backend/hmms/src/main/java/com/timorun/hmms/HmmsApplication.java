package com.timorun.hmms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HmmsApplication {

	public static void main(String[] args) {
		SpringApplication.run(HmmsApplication.class, args);
	}

}
