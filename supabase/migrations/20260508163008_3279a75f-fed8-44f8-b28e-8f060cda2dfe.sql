-- Wipe broken 1970-dated ticket imports so we can re-import with correct dates from spreadsheet
DELETE FROM ticket_messages;
DELETE FROM tickets;