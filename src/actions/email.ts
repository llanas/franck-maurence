import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:content";
import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const defaultEmail = import.meta.env.DEFAULT_EMAIL ||
    "contact@franck-maurence.org";
const audienceId = import.meta.env.RESEND_AUDIENCE_BROADCAST_ID;

export const emailActions = {
    send: defineAction({
        accept: "form",
        input: z.object({
            email: z.string().email(),
            firstname: z.string().min(1),
            lastname: z.string().min(1),
            subject: z.string().min(1),
            message: z.string().min(1),
            save: z.boolean().optional(),
        }),
        handler: async (
            { email, firstname, lastname, subject, message, save },
        ) => {
            // Si le champ "save" est coché, on envoie l'email à Resend
            // Et on sauvegarde l'utilisateur dans la liste de diffusion Strapi
            if (save) {
                // ajout de l'utilisateur dans resend
                console.log(`Saving new user: ${email} to strapi and resend`);
                const {
                    data: resendContactResponse,
                    error: resendContactError,
                } = await resend.contacts.create({
                    email,
                    firstName: firstname,
                    lastName: lastname,
                    audienceId,
                    unsubscribed: false,
                });
                if (resendContactError) {
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: resendContactError.message,
                    });
                }
                console.log(
                    `Resend contact created: ${resendContactResponse!.id}`,
                );
                // Si ajout réussi, on ajoute l'utilisateur dans Strapi
                const strapiResponse = await fetch(
                    `${import.meta.env.STRAPI_URL}/api/subscribers`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization:
                                `Bearer ${import.meta.env.STRAPI_API_KEY}`,
                        },
                        body: JSON.stringify({
                            data: {
                                email,
                                firstname,
                                lastname,
                                resend_id: resendContactResponse!.id,
                            },
                        }),
                    },
                );
                console.log(`Strapi response: ${strapiResponse.status}`);
                if (!strapiResponse.ok) {
                    const strapiError = await strapiResponse.json();
                    console.error(strapiError);
                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message: strapiError.error.message,
                    });
                }
                console.log(`Strapi contact created: ${email}`);
            }
            console.log(
                `${save} - Sending email to ${email} with subject "${subject}" and message "${message}"`,
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

            return {
                status: "success",
                data: data,
            };
        },
    }),
};
