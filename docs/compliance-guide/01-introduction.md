# 1. Introduction

## Purpose

This guide supports three readers: a laboratory director or quality manager preparing for an accreditation inspection; a hospital IT, privacy or procurement team assessing PathScribe; and ForMedrixAI and partner staff answering questionnaires. It lists capabilities and where to verify them. It does not give legal advice and does not certify anything.

## Scope

PathScribe is an AI-assisted clinical pathology reporting and laboratory information platform. This guide covers the software and what ForMedrixAI operates. It does not cover the laboratory's own procedures, the hospital network, the identity provider, hosting or backups, except to say who owns them (chapter 8).

## What "supports" means here

A capability supports a requirement when it gives the laboratory a control it can configure, use and show an inspector. It does not mean the requirement is met. Whether a laboratory meets a requirement depends on how it configures and uses the product and on everything outside it.

## Two builds, and why status matters

- **Demonstration build.** Runs in the browser against sample data. Several controls exist here as screens and rules but are not enforced by a server.
- **Server deployment** (API server, SQL Server, single sign-on only). Several controls are specified and the browser side is built, but the server routes and server-side enforcement are **not built yet** (phase 2e). Chapters 4 to 7 mark each such control **Built (Demo)** or **Partial** rather than Live.

A laboratory must not treat a **Built (Demo)** control as an enforced production control. This guide is the place a buyer should check that.

## Validation responsibilities

PathScribe ships as one validated build for every site, with each deployment's addresses and sign-in settings in its own `config.json`. The laboratory still owns: installation and operational qualification at its site, user acceptance testing against its own procedures, change control for updates, and periodic review. ForMedrixAI provides the test evidence it holds (`docs/quality/evidence/`) and will provide the Validation Guide and an installation qualification checklist per hosting location (**Planned**, PS-539). Machine-translated interface text and guides need native-speaker review before clinical use.

## Shared-responsibility model

Four parties: **PathScribe** (the software), **the customer** (laboratory and hospital), **the identity provider** (sign-in, passwords, multi-factor) and **the host** (cloud or on-premises platform, backups, network). Chapter 8 divides each requirement among them. Where the table says Customer, the software gives no assurance.
