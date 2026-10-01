package com.timorun.hmms;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * Base class for tests that need the full Spring context and a real Postgres database.
 * Each test runs in a transaction that is rolled back afterwards.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public abstract class IntegrationTest {
}
