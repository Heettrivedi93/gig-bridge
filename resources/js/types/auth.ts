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
