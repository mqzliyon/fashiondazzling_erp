"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  businessName: z.string().min(1, "Business name is required."),
  businessNumber: z.string().min(1, "Business number is required."),
  email: z.email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  businessAddress: z.string().min(1, "Business address is required."),
  businessLogoUrl: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

type RegisterResponse = {
  data: {
    token: string;
    user: {
      _id?: string;
      name?: string;
      email?: string;
      role?: string;
    };
  };
};

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [apiError, setApiError] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");
  const [isRegistrationEnabled, setIsRegistrationEnabled] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      businessName: "",
      businessNumber: "",
      email: "",
      password: "",
      businessAddress: "",
      businessLogoUrl: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);
    try {
      const response = await api.post<RegisterResponse>("/auth/register", {
        ...values,
        businessLogoUrl: businessLogoUrl || values.businessLogoUrl || "",
      });
      setAuth(response.data.data.token, response.data.data.user);
      router.replace("/dashboard");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message ===
          "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || ""
          : "Registration failed. Please try again.";
      setApiError(message);
    }
  };

  useEffect(() => {
    let mounted = true;
    const checkRegistrationMode = async () => {
      try {
        const response = await api.get<{ data?: { registrationEnabled?: boolean } }>(
          "/auth/registration-status"
        );
        const enabled = response.data?.data?.registrationEnabled !== false;
        if (!mounted) return;
        setIsRegistrationEnabled(enabled);
        if (!enabled) {
          router.replace("/login");
        }
      } catch {
        if (!mounted) return;
        setIsRegistrationEnabled(true);
      }
    };
    void checkRegistrationMode();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (isRegistrationEnabled === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-muted-foreground">Checking registration availability...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
            <Building2 className="size-3.5" />
            Fashion Dazzling ERP
          </div>
          <CardTitle>Create Admin Account</CardTitle>
          <CardDescription>Registration creates a default admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" {...register("businessName")} />
              {errors.businessName && (
                <p className="text-xs text-destructive">{errors.businessName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessNumber">Business Number</Label>
              <Input id="businessNumber" {...register("businessNumber")} />
              {errors.businessNumber && (
                <p className="text-xs text-destructive">{errors.businessNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Input id="businessAddress" {...register("businessAddress")} />
              {errors.businessAddress && (
                <p className="text-xs text-destructive">{errors.businessAddress.message}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessLogoUrl">Business Logo (Optional)</Label>
              <Input
                id="businessLogoUrl"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setBusinessLogoUrl("");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setBusinessLogoUrl(String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            {apiError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
                {apiError}
              </div>
            )}
            <Button type="submit" className="md:col-span-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating Admin Account...
                </>
              ) : (
                "Register"
              )}
            </Button>
            <p className="text-sm text-muted-foreground md:col-span-2">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Go to login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

