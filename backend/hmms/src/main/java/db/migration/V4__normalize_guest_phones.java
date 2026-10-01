package db.migration;

import com.timorun.hmms.util.PhoneNumbers;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Rewrites existing guest phone numbers to E.164 so WhatsApp links work.
 * Numbers that can't be parsed are left untouched.
 */
public class V4__normalize_guest_phones extends BaseJavaMigration {
    private static final String DEFAULT_REGION = "ES";

    @Override
    public void migrate(Context context) throws Exception {
        Map<Long, String> updates = new LinkedHashMap<>();

        try (Statement select = context.getConnection().createStatement();
             ResultSet rows = select.executeQuery("SELECT guest_id, phone FROM guests WHERE phone IS NOT NULL AND phone <> ''")) {
            while (rows.next()) {
                long guestId = rows.getLong("guest_id");
                String phone = rows.getString("phone");
                PhoneNumbers.toE164(phone, DEFAULT_REGION)
                        .filter(normalized -> !normalized.equals(phone))
                        .ifPresent(normalized -> updates.put(guestId, normalized));
            }
        }

        try (PreparedStatement update = context.getConnection().prepareStatement("UPDATE guests SET phone = ? WHERE guest_id = ?")) {
            for (Map.Entry<Long, String> entry : updates.entrySet()) {
                update.setString(1, entry.getValue());
                update.setLong(2, entry.getKey());
                update.addBatch();
            }
            update.executeBatch();
        }
    }
}
