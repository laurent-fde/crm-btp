"use server";

// Présentation : une action déclenchée par l'utilisateur. Passe par un service, jamais par la base.

import { getExampleService } from "@/composition";

export async function listExamplesAction() {
  const { examples } = await getExampleService().listExamples();
  return examples;
}
