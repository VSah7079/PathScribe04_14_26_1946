# Cold chain: storage units, condition types and temperature readings (Batch 610)

Status: **Built (Demo).** The browser side is complete. Readings come from a labelled **Simulated** control until the server receives a real sensor feed.

## What a person can do

- **Configuration → System → Cold chain** (`config:cold-chain:manage`; viewing needs no permission beyond the section): add, edit, deactivate and reactivate **storage units** (name, condition type); add, edit, deactivate, reactivate and remove **condition types** (name, highest allowed temperature, optional lowest). The two built-in types (frozen tissue, highest −20 °C; fresh tissue, highest 8 °C) cannot be removed. A tab lists the **smart containers**.
- **Readings and excursion status** on each storage unit and smart container: the latest reading, how many readings and excursions, and the five most recent. A reading outside its condition type's range is an **excursion**.
- **Simulated temperature reading** (`batch:cold-chain-reading:simulate`): on a storage unit, a container and the batch detail page, a control labelled Simulated sends one reading through the same processing a real sensor reading takes. It says what happened: within range or excursion, the batch put on hold, the CAPA items raised (one open "cold-chain excursion" deficiency per case in the batch). The reading, the hold and the Audit Log entry ("Simulated Temperature Reading", no patient data) all say Simulated.
- A held batch is released the usual way: acknowledge the excursion on the batch (`batch:cold-chain-excursion:acknowledge`).

## What waits for the server

The MQTT/IoT endpoint and the REST endpoint that receive sensor readings, and the durable reading store. The real feed sends the same event without `simulated`; nothing in the browser changes. See `src/services/coldChain/README.md`.
