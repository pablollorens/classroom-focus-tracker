"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Toast } from "@/components/Toast";

export default function StudentLoginPage() {
    const router = useRouter();
    const t = useTranslations("auth");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                username: username.trim(),
                redirect: false,
            });

            if (result?.error) {
                setError(t("invalidUsername"));
                setLoading(false);
            } else {
                // Successful login
                router.push("/class/session");
            }
        } catch (err) {
            setError(t("somethingWentWrong"));
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50 dark:bg-gray-900">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
                    {t("studentLogin")}
                </h2>
                <p className="text-center text-sm text-gray-500 mt-2">
                    {t("enterUsername")}
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                            {t("username")}
                        </label>
                        <div className="mt-2">
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6 px-3 bg-white dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                                placeholder={t("usernamePlaceholder")}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                        >
                            {loading ? t("signingIn") : t("signIn")}
                        </button>
                    </div>
                </form>

                <p className="mt-10 text-center text-sm/6 text-gray-500">
                    {t("areYouTeacher")}{" "}
                    <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {t("teacherLogin")}
                    </Link>
                </p>
            </div>
        </div>
    );
}
