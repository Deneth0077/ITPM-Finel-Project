import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="React.js SignIn Dashboard | HomeStore - Next.js Admin Dashboard Template"
        description="This is React.js SignIn Tables Dashboard page for HomeStore - React.js"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
