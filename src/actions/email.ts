import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:content";
import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const defaultEmail = import.meta.env.DEFAULT_EMAIL ||
    "contact@franck-maurence.org";

export const emailActions = {
    send: defineAction({
        accept: "form",
        input: z.object({
            email: z.string().email(),
            subject: z.string().min(1),
            message: z.string().min(1),
        }),
        handler: async ({ email, subject, message }) => {
            console.log(
                `Sending email to ${email} with subject "${subject}" and message "${message}"`,
            );
            const { data, error } = await resend.emails.send({
                from: defaultEmail,
                to: [defaultEmail],
                subject: `from: ${email} - subject: ${subject}`,
                html: message,
            });

            if (error) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: error.message,
                });
            }

            return data;
        },
    }),
};
