"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  customer_type: string | null;
};

export default function PostJobPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [service, setService] = useState("");
  const [description, setDescription] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [wasteType, setWasteType] = useState("");
  const [loadSize, setLoadSize] = useState("");
  const [accessDetails, setAccessDetails] = useState("");
  const [labourNeeded, setLabourNeeded] = useState("");
  const [floorLevel, setFloorLevel] = useState("");
  const [urgency, setUrgency] = useState("");
  const [specialItems, setSpecialItems] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCustomer() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/customer/login");
          return;
        }

        const { data, error } = await supabase
          .from("customers")
          .select(
            "id, full_name, business_name, email, phone, customer_type"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Customer lookup error:", error);
        }

        if (mounted) {
          setCustomer(
            data
              ? {
                  id: data.id,
                  full_name: data.full_name,
                  business_name: data.business_name,
                  email: data.email,
                  phone: data.phone,
                  customer_type: data.customer_type,
                }
              : {
                  id: user.id,
                  full_name:
                    user.user_metadata?.full_name ?? null,
                  business_name: null,
                  email: user.email ?? null,
                  phone:
                    user.user_metadata?.phone ?? null,
                  customer_type: "individual",
                }
          );

          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load customer:", error);

        if (mounted) {
          setMessage(
            "We couldn't load your account. Please log in again."
          );
          setLoading(false);
        }
      }
    }

    loadCustomer();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!customer) {
      setMessage("Please log in before posting a job.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("jobs")
        .insert({
          customer_id: customer.id,
          service,
          description,
          postcode,
          address,
          waste_type: wasteType,
          load_size: loadSize,
          access_details: accessDetails,
          labour_needed: labourNeeded,
          floor_level: floorLevel,
          urgency,
          special_items: specialItems,
          status: "open",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Create job error:", error);

        setMessage(
          error.message ||
            "We couldn't post your job. Please try again."
        );

        setSubmitting(false);
        return;
      }

      if (data?.id) {
        router.push(`/customer/jobs/${data.id}`);
        return;
      }

      router.push("/customer/dashboard");
    } catch (error) {
      console.error("Unexpected job submission error:", error);

      setMessage(
        "Something went wrong while posting your job. Please try again."
      );

      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-gray-600">
              Loading your account...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/customer/dashboard")}
            className="mb-5 text-sm font-semibold text-green-600 hover:underline"
          >
            ← Back to dashboard
          </button>

          <h1 className="text-3xl font-bold text-gray-900">
            Post a job
          </h1>

          <p className="mt-2 text-gray-600">
            Tell us what needs clearing and receive quotes
            from available drivers.
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-white p-8 shadow-sm"
        >
          {/* SERVICE */}
          <div>
            <label
              htmlFor="service"
              className="text-sm font-medium text-gray-700"
            >
              Service
            </label>

            <select
              id="service"
              required
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select a service</option>
              <option value="House Clearance">
                House Clearance
              </option>
              <option value="Garden Waste Removal">
                Garden Waste Removal
              </option>
              <option value="General Rubbish Removal">
                General Rubbish Removal
              </option>
              <option value="Furniture Disposal">
                Furniture Disposal
              </option>
              <option value="Shed Clearance">
                Shed Clearance
              </option>
              <option value="Garage Clearance">
                Garage Clearance
              </option>
              <option value="Builders Waste">
                Builders Waste
              </option>
              <option value="Scrap Collection">
                Scrap Collection
              </option>
              <option value="Small Removals">
                Small Removals
              </option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* DESCRIPTION */}
          <div>
            <label
              htmlFor="description"
              className="text-sm font-medium text-gray-700"
            >
              What needs removing?
            </label>

            <textarea
              id="description"
              required
              rows={5}
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              placeholder="Tell us what rubbish or items need removing..."
            />
          </div>

          {/* ADDRESS */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="postcode"
                className="text-sm font-medium text-gray-700"
              >
                Postcode
              </label>

              <input
                id="postcode"
                required
                value={postcode}
                onChange={(e) =>
                  setPostcode(e.target.value.toUpperCase())
                }
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                placeholder="B1 1AA"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="text-sm font-medium text-gray-700"
              >
                Full address
              </label>

              <input
                id="address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                placeholder="House number and street"
              />
            </div>
          </div>

          {/* WASTE DETAILS */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="wasteType"
                className="text-sm font-medium text-gray-700"
              >
                Waste type
              </label>

              <select
                id="wasteType"
                required
                value={wasteType}
                onChange={(e) =>
                  setWasteType(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="">Select waste type</option>
                <option value="Household">
                  Household
                </option>
                <option value="Garden">
                  Garden
                </option>
                <option value="Builders">
                  Builders
                </option>
                <option value="Furniture">
                  Furniture
                </option>
                <option value="Mixed Waste">
                  Mixed Waste
                </option>
                <option value="Scrap Metal">
                  Scrap Metal
                </option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="loadSize"
                className="text-sm font-medium text-gray-700"
              >
                Estimated load size
              </label>

              <select
                id="loadSize"
                required
                value={loadSize}
                onChange={(e) =>
                  setLoadSize(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="">Select load size</option>
                <option value="Small">
                  Small - up to 1/4 van
                </option>
                <option value="Medium">
                  Medium - up to 1/2 van
                </option>
                <option value="Large">
                  Large - up to 3/4 van
                </option>
                <option value="Full Van">
                  Full van
                </option>
                <option value="Multiple Loads">
                  Multiple loads
                </option>
              </select>
            </div>
          </div>

          {/* ACCESS */}
          <div>
            <label
              htmlFor="accessDetails"
              className="text-sm font-medium text-gray-700"
            >
              Access details
            </label>

            <textarea
              id="accessDetails"
              rows={3}
              value={accessDetails}
              onChange={(e) =>
                setAccessDetails(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              placeholder="Parking, side access, narrow entrance, stairs, etc."
            />
          </div>

          {/* LABOUR */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="labourNeeded"
                className="text-sm font-medium text-gray-700"
              >
                Labour needed
              </label>

              <select
                id="labourNeeded"
                required
                value={labourNeeded}
                onChange={(e) =>
                  setLabourNeeded(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="">Select an option</option>
                <option value="Driver only">
                  Driver only
                </option>
                <option value="Driver + 1">
                  Driver + 1 person
                </option>
                <option value="Driver + 2">
                  Driver + 2 people
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="floorLevel"
                className="text-sm font-medium text-gray-700"
              >
                Floor / stairs
              </label>

              <select
                id="floorLevel"
                value={floorLevel}
                onChange={(e) =>
                  setFloorLevel(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="">Select</option>
                <option value="Ground floor">
                  Ground floor
                </option>
                <option value="First floor">
                  First floor
                </option>
                <option value="Second floor">
                  Second floor
                </option>
                <option value="Multiple floors">
                  Multiple floors
                </option>
                <option value="No stairs">
                  No stairs
                </option>
              </select>
            </div>
          </div>

          {/* URGENCY */}
          <div>
            <label
              htmlFor="urgency"
              className="text-sm font-medium text-gray-700"
            >
              When do you need the job completed?
            </label>

            <select
              id="urgency"
              required
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select urgency</option>
              <option value="ASAP">ASAP</option>
              <option value="Today">Today</option>
              <option value="Tomorrow">Tomorrow</option>
              <option value="Within 3 days">
                Within 3 days
              </option>
              <option value="Within a week">
                Within a week
              </option>
              <option value="Flexible">I'm flexible</option>
            </select>
          </div>

          {/* SPECIAL ITEMS */}
          <div>
            <label
              htmlFor="specialItems"
              className="text-sm font-medium text-gray-700"
            >
              Special items
            </label>

            <textarea
              id="specialItems"
              rows={3}
              value={specialItems}
              onChange={(e) =>
                setSpecialItems(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              placeholder="Anything unusual such as fridges, mattresses, heavy items, etc."
            />
          </div>

          {/* ERROR / MESSAGE */}
          {message && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {message}
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={submitting || !customer}
            className="w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Posting your job..."
              : "Post Job & Get Quotes"}
          </button>
        </form>
      </div>
    </main>
  );
}