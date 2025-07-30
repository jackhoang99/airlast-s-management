import { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";

const MyAccount = () => {
  const { supabase, session } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    username: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!supabase || !session) return;

      try {
        setIsLoading(true);

        // Get user profile from users table by email (matching technician auth logic)
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", session.user.email)
          .maybeSingle();

        if (error) throw error;

        // If no user profile exists, create a default one with auth user data
        if (!data) {
          // Generate a unique username by combining email prefix with part of user ID
          const emailPrefix = session.user.email?.split("@")[0] || "user";
          const userIdSuffix = session.user.id.substring(0, 8); // First 8 characters of UUID
          const uniqueUsername = `${emailPrefix}_${userIdSuffix}`;

          const defaultProfile = {
            id: session.user.id,
            email: session.user.email || "",
            username: uniqueUsername,
            first_name: "",
            last_name: "",
            phone: "",
            role: "technician",
            status: "active",
            auth_id: session.user.id,
          };

          // Try to create the user profile
          const { data: newProfile, error: createError } = await supabase
            .from("users")
            .insert(defaultProfile)
            .select()
            .single();

          if (createError) {
            console.error("Error creating user profile:", createError);
            // If creation fails, use the default profile for display
            setUserProfile(defaultProfile);
            setFormData({
              first_name: defaultProfile.first_name,
              last_name: defaultProfile.last_name,
              email: defaultProfile.email,
              phone: defaultProfile.phone,
              username: defaultProfile.username,
              current_password: "",
              new_password: "",
              confirm_password: "",
            });
          } else {
            setUserProfile(newProfile);
            setFormData({
              first_name: newProfile.first_name || "",
              last_name: newProfile.last_name || "",
              email: newProfile.email || "",
              phone: newProfile.phone || "",
              username: newProfile.username || "",
              current_password: "",
              new_password: "",
              confirm_password: "",
            });
          }
        } else {
          setUserProfile(data);
          setFormData({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            phone: data.phone || "",
            username: data.username || "",
            current_password: "",
            new_password: "",
            confirm_password: "",
          });
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load user profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [supabase, session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !session) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Check if passwords match if changing password
      if (
        formData.new_password &&
        formData.new_password !== formData.confirm_password
      ) {
        throw new Error("New passwords do not match");
      }

      // Update user profile in users table by email
      const { error: updateError } = await supabase
        .from("users")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          // Don't update email or username here as they require special handling
          updated_at: new Date().toISOString(),
        })
        .eq("email", session.user.email);

      if (updateError) throw updateError;

      // Update password if provided
      if (formData.current_password && formData.new_password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.new_password,
        });

        if (passwordError) throw passwordError;
      }

      // Update email if changed
      if (formData.email !== userProfile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (emailError) throw emailError;
      }

      setSuccess("Profile updated successfully");
      setIsEditing(false);

      // Update local user profile
      setUserProfile((prev) => ({
        ...prev,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      }));

      // Clear password fields
      setFormData((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !userProfile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Account</h1>

      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-success-50 border-l-4 border-success-500 p-4 rounded-md">
          <div className="flex">
            <Save className="h-5 w-5 text-success-500" />
            <div className="ml-3">
              <p className="text-sm text-success-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Profile Information</h2>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-secondary"
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="last_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="input pl-10"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Username cannot be changed
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-md font-medium mb-4">Change Password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="current_password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      id="current_password"
                      name="current_password"
                      value={formData.current_password}
                      onChange={handleChange}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="new_password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="password"
                        id="new_password"
                        name="new_password"
                        value={formData.new_password}
                        onChange={handleChange}
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm_password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="password"
                        id="confirm_password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        className="input pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="mt-1 flex items-center">
                  <User size={16} className="text-gray-400 mr-2" />
                  {userProfile?.first_name} {userProfile?.last_name}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 flex items-center">
                  <Mail size={16} className="text-gray-400 mr-2" />
                  {userProfile?.email}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                <p className="mt-1 flex items-center">
                  <Phone size={16} className="text-gray-400 mr-2" />
                  {userProfile?.phone || "Not provided"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Username</h3>
                <p className="mt-1 flex items-center">
                  <Shield size={16} className="text-gray-400 mr-2" />
                  {userProfile?.username}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Role</h3>
                <p className="mt-1 flex items-center">
                  <Shield size={16} className="text-gray-400 mr-2" />
                  <span className="capitalize">{userProfile?.role}</span>
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Account Created
                </h3>
                <p className="mt-1">
                  {userProfile?.created_at
                    ? new Date(userProfile.created_at).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-gray-200">
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Account Security</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Password</h3>
            <p className="mt-1 text-gray-700">••••••••</p>
            <button
              onClick={() => {
                setIsEditing(true);
                // Scroll to password section
                setTimeout(() => {
                  document
                    .getElementById("current_password")
                    ?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="text-primary-600 hover:text-primary-800 text-sm mt-2"
            >
              Change password
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Session Information</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Login</h3>
            <p className="mt-1 text-gray-700">
              {session?.user?.last_sign_in_at
                ? new Date(session.user.last_sign_in_at).toLocaleString()
                : "Unknown"}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Current Session
            </h3>
            <p className="mt-1 text-gray-700">
              Started:{" "}
              {session?.created_at
                ? new Date(session.created_at).toLocaleString()
                : "Unknown"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;
