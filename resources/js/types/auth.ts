export type User = {
    id: number;
    name: string;
    email: string;
    bio?: string | null;
    phone?: string | null;
    profile_picture?: string | null;
    skills?: string | null;
    location?: string | null;
    website?: string | null;
    avatar?: string;
    notification_preferences?: {
        email_enabled?: boolean;
        email_events?: string[];
        in_app_enabled?: boolean;
        in_app_events?: string[];
        twilio_enabled?: boolean;
        twilio_events?: string[];
    } | null;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    roles: string[];
    permissions?: string[];
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
