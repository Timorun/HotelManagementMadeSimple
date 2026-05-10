package com.timorun.hmms.controllers;

import com.timorun.hmms.entities.Nationality;
import com.timorun.hmms.repositories.NationalityRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/nationalities")
public class NationalityController {
    private final NationalityRepository nationalityRepository;

    public NationalityController(NationalityRepository nationalityRepository) {
        this.nationalityRepository = nationalityRepository;
    }

    /**
     * Get all nationalities.
     * GET /api/nationalities
     */
    @GetMapping
    public ResponseEntity<List<Nationality>> getAllNationalities() {
        List<Nationality> nationalities = nationalityRepository.findAll();
        return ResponseEntity.ok(nationalities);
    }
}
