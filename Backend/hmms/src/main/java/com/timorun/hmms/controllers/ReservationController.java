package com.timorun.hmms.controllers;

import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.repositories.ReservationRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationRepository repo;

    public ReservationController(ReservationRepository repo) {
        this.repo = repo;
    }

    @PostMapping
    public Reservation create(@RequestBody Reservation reservation) {
        return repo.save(reservation);
    }

    @GetMapping
    public List<Reservation> list(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to
    ) {
        return repo.findByCheckInBetween(from, to);
    }
}
